import { redirect } from 'next/navigation';

export default function CreditTopupSuccessRedirect() {
  redirect('/donate/success');
}
