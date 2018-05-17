export interface InitialState {
  isPending: boolean;
  status: string;
  meta: {
    title: string;
    description: string;
    thumbnail: string;
  };
  duration?: number;
  volume?: number;
}
