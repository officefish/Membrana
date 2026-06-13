import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ApiErrorBodyDto } from './common.dto';

/** Standard auth / not-found responses for guarded routes. */
export function ApiStandardErrors(): MethodDecorator {
  return applyDecorators(
    ApiResponse({ status: 401, description: 'Invalid or missing X-Membrana-Token' }),
    ApiResponse({ status: 404, description: 'Resource not found', type: ApiErrorBodyDto }),
  );
}

export function ApiBadRequest(): MethodDecorator {
  return applyDecorators(
    ApiResponse({ status: 400, description: 'Validation error', type: ApiErrorBodyDto }),
  );
}
