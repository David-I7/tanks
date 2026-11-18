export type ContraintValidationDtoType = "OBJECT" | "FIELD";

export default interface ContraintValidationDto {
  type: ContraintValidationDtoType;
  field?: string;
  objectName: string;
  message: string;
}
