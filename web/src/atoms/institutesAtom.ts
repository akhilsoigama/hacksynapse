import { atom } from 'jotai';
import { IInstitute } from '../types/Institute';

export const institutesAtom = atom<IInstitute[]>([
  {
    id: 1,
    instituteName: "ABC University",
    instituteCode: "ABC123",
    instituteType: "University",
    instituteAddress: "123 Main Street",
    instituteCity: "Mumbai",
    instituteState: "Maharashtra",
    instituteCountry: "India",
    institutePinCode: "400001",
    institutePhone: "+91-9876543210",
    instituteEmail: "info@abcuniversity.edu",
    instituteWebsite: "https://www.abcuniversity.edu",
    principalName: "Dr. John Doe",
    principalEmail: "principal@abcuniversity.edu",
    principalPhone: "+91-9123456780",
    principalQualification: "PhD in Education",
    principalExperience: "25",
    establishedYear: "1995",
    affiliation: "State University",
    roleId: 1,
    isActive: true,
  }
]);
