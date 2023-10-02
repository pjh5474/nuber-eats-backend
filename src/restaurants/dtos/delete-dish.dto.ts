import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { CoreOutput } from 'src/common/dtos/output.dto';

@InputType()
export class deleteDishInput {
  @Field((type) => Number)
  dishId: number;
}

@ObjectType()
export class deleteDishOutput extends CoreOutput {}
