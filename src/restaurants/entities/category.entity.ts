import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { Column, Entity, OneToMany } from 'typeorm';
import { IsString, Length } from 'class-validator';
import { CoreEntity } from 'src/common/entities/core.entity';
import { Restaurant } from './restaurant.entity';

@InputType('CategoryInputType', { isAbstract: true })
@ObjectType()
@Entity()
export class Category extends CoreEntity {
  @Field((type) => String)
  @Column({ unique: true })
  @IsString()
  name: string;

  @Field((type) => String)
  @Column({ nullable: true })
  @IsString()
  coverImg: string;

  @Field((type) => String)
  @Column()
  @IsString()
  slug: string;

  @OneToMany((type) => Restaurant, (restaurant) => restaurant.category)
  @Field((type) => [Restaurant], { nullable: true })
  restaurants: Restaurant[];
}
