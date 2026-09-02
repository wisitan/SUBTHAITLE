import { redirect } from 'next/navigation';

export default function CreditTopupRedirect() {
  redirect('/donate');
}
