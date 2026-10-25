import { Gender } from "@/types/enum"

export type EmployeePID = {
  id: number
  avatar_url: string
  employee_no: string
  first_name: string
  last_name: string
  middle_name: string
  suffix: string
  email: string
  phone: string
  gender: Gender
  address: string
  region: string
  province: string
  city: string
  zip_code: string
  date_of_birth: string
}

export type EmployeeWID = {
  name: string
  age: number
  title?: string // optional or required depending on your schema
}

export type EmployeeBID = {
  name: string
  age: number
  title?: string // optional or required depending on your schema
}
