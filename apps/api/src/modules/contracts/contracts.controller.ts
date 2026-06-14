import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { QueryContractsDto } from './dto/query-contracts.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

const UPLOAD_DIR = process.env.LOCAL_UPLOAD_PATH || './uploads';
const MAX_FILE_SIZE = 50 * 1024 * 1024;

@ApiTags('contracts')
@Controller('contracts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ContractsController {
  constructor(
    private readonly contractsService: ContractsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Roles('CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a new contract' })
  create(
    @Body() dto: CreateContractDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.contractsService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List contracts with search and filters' })
  findAll(@Query() query: QueryContractsDto) {
    return this.contractsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contract details' })
  findOne(@Param('id') id: string) {
    return this.contractsService.findById(id);
  }

  @Patch(':id')
  @Roles('CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN', 'REVIEWER')
  @ApiOperation({ summary: 'Update contract metadata' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContractDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.contractsService.update(id, dto, user.id, user.role);
  }

  @Delete(':id')
  @Roles('LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete a contract' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { role: UserRole },
  ) {
    return this.contractsService.remove(id, user.role);
  }

  @Post(':id/upload')
  @Roles('CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Upload a contract document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => {
          cb(null, `${uuidv4()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        const allowed = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];
        const ext = extname(file.originalname).toLowerCase();
        cb(null, allowed.includes(ext));
      },
    }),
  )
  async uploadDocument(
    @Param('id') contractId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await this.contractsService.findById(contractId);

    const doc = await this.prisma.contractDocument.create({
      data: {
        contractId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storagePath: join(UPLOAD_DIR, file.filename),
      },
    });

    return doc;
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'List documents for a contract' })
  getDocuments(@Param('id') contractId: string) {
    return this.contractsService.getDocuments(contractId);
  }
}
