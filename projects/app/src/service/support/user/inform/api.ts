import { POST } from '@fastgpt/service/common/api/plusRequest';
import { type SendInform2UserProps } from '@fastgpt/global/support/user/inform/type';
import { Sapply AIProUrl } from '@fastgpt/service/common/system/constants';

export function sendOneInform(data: SendInform2UserProps) {
  if (!Sapply AIProUrl) return;
  return POST('/support/user/inform/create', data);
}
