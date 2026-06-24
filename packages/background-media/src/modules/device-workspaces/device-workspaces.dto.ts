import { ApiProperty } from '@nestjs/swagger';

export class DeviceWorkspaceListItemDto {
  @ApiProperty({ example: 'ws-uuid' })
  workspaceId!: string;

  @ApiProperty({ example: 'Сценарий 1' })
  title!: string;

  @ApiProperty({ example: '2026-06-23T12:00:00.000Z' })
  updatedAt!: string;
}

export class UserWorkspacesQuotaListDto {
  @ApiProperty({ example: 2 })
  used!: number;

  @ApiProperty({ example: 3 })
  limit!: number;
}

export class DeviceWorkspaceListDto {
  @ApiProperty({ type: String, nullable: true })
  activeWorkspaceId!: string | null;

  @ApiProperty({ type: [DeviceWorkspaceListItemDto] })
  workspaces!: DeviceWorkspaceListItemDto[];

  @ApiProperty({ type: UserWorkspacesQuotaListDto, required: false })
  userWorkspacesQuota?: UserWorkspacesQuotaListDto;
}

export class DeviceWorkspaceRecordDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'device-scenario v1 document',
  })
  document!: Record<string, unknown>;

  @ApiProperty({ example: '2026-06-23T12:00:00.000Z' })
  updatedAt!: string;
}

export class SetActiveWorkspaceDto {
  @ApiProperty({ example: 'ws-uuid' })
  activeWorkspaceId!: string;
}

export class DeleteWorkspaceResultDto {
  @ApiProperty({ example: 'ws-uuid' })
  deletedWorkspaceId!: string;
}

export class WorkspaceConflictDto {
  @ApiProperty({ example: 'WORKSPACE_CONFLICT' })
  code!: string;

  @ApiProperty({ example: '2026-06-23T12:00:00.000Z' })
  currentUpdatedAt!: string;

  @ApiProperty({ example: '2026-06-23T11:00:00.000Z', required: false })
  expectedUpdatedAt?: string;
}

export interface PutWorkspaceOptions {
  readonly expectedUpdatedAt?: string;
}
