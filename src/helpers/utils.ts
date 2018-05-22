import { promisify } from 'util';

export const promisifyAndBind = (method: any, instance: any) => {
  return promisify(method.bind(instance));
};
