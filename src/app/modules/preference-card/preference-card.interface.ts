import { Types } from 'mongoose';

export type SurgeonInfo = {
  fullName: string;
  handPreference: string;
  specialty: string;
  contactNumber: string;
  musicPreference: string;
};

export type PreferenceCard = {
  createdBy: string;
  cardTitle: string;
  surgeon: SurgeonInfo;
  medication: string;
  supplies: Types.ObjectId[];
  sutures: Types.ObjectId[];
  instruments: string;
  positioningEquipment: string;
  prepping: string;
  workflow: string;
  keyNotes: string;
  photoLibrary: string[];
  downloadCount: number;
  published: boolean;
};
