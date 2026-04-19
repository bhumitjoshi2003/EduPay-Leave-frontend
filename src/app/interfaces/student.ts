export interface Student {
  studentId: string;
  name: string;
  className: string;
  phoneNumber?: string;
  email?: string;
  gender?: string;
  dob?: string;
  fatherName?: string;
  motherName?: string;
  takesBus?: boolean;
  distance?: number | null;
  joiningDate?: string;
  leavingDate?: string;
  status?: string;
  photoUrl?: string;
}
