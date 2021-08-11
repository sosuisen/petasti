export type AvatarUrl = string;

export type NoteProp = {
  _id: string;
  name: string;
  user: string;
  date: {
    createdDate: string;
    modifiedDate: string;
  };
};
