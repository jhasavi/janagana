import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;

  constructor(total: number, page: number, limit: number) {
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.ceil(total / limit);
  }
}

export class BaseResponseDto<T> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  data: T;

  @ApiPropertyOptional({ type: () => PaginationMetaDto })
  meta?: PaginationMetaDto;

  constructor(data: T, meta?: PaginationMetaDto) {
    this.success = true;
    this.data = data;
    this.meta = meta;
  }
}

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success: false = false;

  @ApiProperty({
    example: { code: 404, message: 'Not found.' },
  })
  error: {
    code: number;
    message: string;
    details?: unknown;
  };

  constructor(code: number, message: string, details?: unknown) {
    this.error = { code, message, ...(details !== undefined ? { details } : {}) };
  }
}
