// For TypeScript
export type Card = {
  id: string;
  type: string;
  user: string;
  data: string;
  date: {
    createdDate: string;
    modifiedDate: string;
  };
  version: string;
};
