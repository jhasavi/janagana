import {
  Controller,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a single image file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Image uploaded.' })
  uploadImage(@UploadedFile() file: Express.Multer.File, @Body('folder') folder?: string) {
    return this.uploadService.uploadImage(file, folder ?? 'images');
  }

  @Post('document')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a single document file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded.' })
  uploadDocument(@UploadedFile() file: Express.Multer.File, @Body('folder') folder?: string) {
    return this.uploadService.uploadDocument(file, folder ?? 'documents');
  }

  @Delete(':publicId')
  @ApiOperation({ summary: 'Delete an uploaded file by Cloudinary public ID' })
  @ApiParam({ name: 'publicId', description: 'Cloudinary public ID for the file' })
  @ApiResponse({ status: 204, description: 'File deleted.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteFile(@Param('publicId') publicId: string) {
    return this.uploadService.deleteFile(publicId);
  }
}
