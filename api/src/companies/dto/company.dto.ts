import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Provence Capteurs' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'PME de 40 personnes, capteurs MEMS pour l’automobile.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 'B4', description: 'Où est le stand dans le gymnase' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  stand?: string;

  @ApiPropertyOptional({ example: 'https://provence-capteurs.example' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ enum: [1, 2], default: 1, description: 'Recruteurs sur le stand : élèves reçus en même temps' })
  @IsOptional()
  @IsIn([1, 2])
  recruiterCount?: number;
}

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {}

export class CreateOfferDto {
  @ApiProperty({ example: 'Stage de conception de circuits analogiques' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: 'Au sein de l’équipe R&D…' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ example: '6 mois', description: 'Telle qu’écrite dans l’offre' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  duration!: string;

  @ApiPropertyOptional({ example: 'Aix-en-Provence' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;
}

export class UpdateOfferDto extends PartialType(CreateOfferDto) {}

export class CreateRecruiterDto {
  @ApiProperty({ example: 'Sophie Durand' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'sophie.durand@provence-capteurs.example' })
  @IsEmail()
  email!: string;
}
