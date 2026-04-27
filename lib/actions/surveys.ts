'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireTenant } from '@/lib/tenant'

// ─── LIST ─────────────────────────────────────────────────────────────────────

export async function getSurveys() {
  try {
    const tenant = await requireTenant()
    const surveys = await prisma.survey.findMany({
      where: { tenantId: tenant.id },
      include: {
        _count: { select: { questions: true, responses: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: surveys }
  } catch (e) {
    console.error('[getSurveys]', e)
    return { success: false, error: 'Failed to load surveys', data: [] }
  }
}

export async function getSurvey(id: string) {
  try {
    const tenant = await requireTenant()
    const survey = await prisma.survey.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        questions: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { responses: true } },
      },
    })
    if (!survey) return { success: false, error: 'Not found', data: null }
    return { success: true, data: survey }
  } catch (e) {
    console.error('[getSurvey]', e)
    return { success: false, error: 'Failed to load survey', data: null }
  }
}

export async function getPublicSurvey(tenantSlug: string, surveyId: string) {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
    if (!tenant) return { success: false, error: 'Not found', data: null }

    const survey = await prisma.survey.findFirst({
      where: { id: surveyId, tenantId: tenant.id, isPublished: true },
      include: { questions: { orderBy: { sortOrder: 'asc' } } },
    })
    if (!survey) return { success: false, error: 'Not found', data: null }

    // Check if closed
    if (survey.closesAt && survey.closesAt < new Date()) {
      return { success: false, error: 'This survey is closed', data: null }
    }

    return { success: true, data: survey }
  } catch (e) {
    console.error('[getPublicSurvey]', e)
    return { success: false, error: 'Failed to load survey', data: null }
  }
}

export async function getSurveyResults(id: string) {
  try {
    const tenant = await requireTenant()
    const survey = await prisma.survey.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: { answers: true },
        },
        _count: { select: { responses: true } },
      },
    })
    if (!survey) return { success: false, error: 'Not found', data: null }
    return { success: true, data: survey }
  } catch (e) {
    console.error('[getSurveyResults]', e)
    return { success: false, error: 'Failed to load results', data: null }
  }
}

// ─── CREATE / UPDATE ──────────────────────────────────────────────────────────

const SurveySchema = z.object({
  title:       z.string().min(1, 'Title required').max(200),
  description: z.string().optional(),
  isPublished: z.boolean().default(false),
  isAnonymous: z.boolean().default(false),
  showResults: z.boolean().default(false),
  closesAt:    z.string().optional().nullable(),
})

export async function createSurvey(input: unknown) {
  try {
    const tenant = await requireTenant()
    const data = SurveySchema.parse(input)
    const survey = await prisma.survey.create({
      data: {
        ...data,
        tenantId: tenant.id,
        closesAt: data.closesAt ? new Date(data.closesAt) : null,
      },
    })
    revalidatePath('/dashboard/surveys')
    return { success: true, data: survey }
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.errors[0].message }
    console.error('[createSurvey]', e)
    return { success: false, error: 'Failed to create survey' }
  }
}

export async function updateSurvey(id: string, input: unknown) {
  try {
    const tenant = await requireTenant()
    const data = SurveySchema.parse(input)
    const survey = await prisma.survey.update({
      where: { id, tenantId: tenant.id },
      data: {
        ...data,
        closesAt: data.closesAt ? new Date(data.closesAt) : null,
      },
    })
    revalidatePath('/dashboard/surveys')
    revalidatePath(`/dashboard/surveys/${id}`)
    return { success: true, data: survey }
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.errors[0].message }
    console.error('[updateSurvey]', e)
    return { success: false, error: 'Failed to update survey' }
  }
}

export async function deleteSurvey(id: string) {
  try {
    const tenant = await requireTenant()
    await prisma.survey.delete({ where: { id, tenantId: tenant.id } })
    revalidatePath('/dashboard/surveys')
    return { success: true }
  } catch (e) {
    console.error('[deleteSurvey]', e)
    return { success: false, error: 'Failed to delete survey' }
  }
}

// ─── QUESTIONS ────────────────────────────────────────────────────────────────

const QuestionSchema = z.object({
  text:       z.string().min(1, 'Question text required'),
  type:       z.enum(['TEXT', 'TEXTAREA', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'RATING', 'YES_NO']),
  options:    z.array(z.string()).default([]),
  isRequired: z.boolean().default(false),
  sortOrder:  z.number().int().default(0),
})

export async function saveSurveyQuestions(
  surveyId: string,
  questions: z.infer<typeof QuestionSchema>[],
) {
  try {
    const tenant = await requireTenant()
    const survey = await prisma.survey.findFirst({ where: { id: surveyId, tenantId: tenant.id } })
    if (!survey) return { success: false, error: 'Survey not found' }

    await prisma.$transaction(async (tx) => {
      await tx.surveyQuestion.deleteMany({ where: { surveyId } })
      if (questions.length > 0) {
        await tx.surveyQuestion.createMany({
          data: questions.map((q, i) => ({
            ...QuestionSchema.parse(q),
            surveyId,
            sortOrder: i,
          })),
        })
      }
    })

    revalidatePath(`/dashboard/surveys/${surveyId}`)
    return { success: true }
  } catch (e) {
    console.error('[saveSurveyQuestions]', e)
    return { success: false, error: 'Failed to save questions' }
  }
}

// ─── SUBMIT RESPONSE ─────────────────────────────────────────────────────────

export async function submitSurveyResponse(
  surveyId: string,
  answers: { questionId: string; value: string }[],
  meta?: { memberId?: string; respondentEmail?: string; ipAddress?: string },
) {
  try {
    const survey = await prisma.survey.findFirst({
      where: { id: surveyId, isPublished: true },
      include: { questions: true },
    })
    if (!survey) return { success: false, error: 'Survey not found' }
    if (survey.closesAt && survey.closesAt < new Date()) {
      return { success: false, error: 'This survey is closed' }
    }

    // Validate required questions
    const required = survey.questions.filter((q) => q.isRequired)
    for (const q of required) {
      const ans = answers.find((a) => a.questionId === q.id)
      if (!ans || !ans.value.trim()) {
        return { success: false, error: `"${q.text}" is required` }
      }
    }

    await prisma.surveyResponse.create({
      data: {
        surveyId,
        memberId:        meta?.memberId ?? null,
        respondentEmail: meta?.respondentEmail ?? null,
        ipAddress:       meta?.ipAddress ?? null,
        answers: {
          create: answers.map((a) => ({
            questionId: a.questionId,
            value:      a.value,
          })),
        },
      },
    })

    return { success: true }
  } catch (e) {
    console.error('[submitSurveyResponse]', e)
    return { success: false, error: 'Failed to submit response' }
  }
}
