import { redirect } from 'next/navigation'

// Root redirect: middleware gestisce auth, ma questo garantisce
// che / non mostri mai il template default di Next.js
export default function Home() {
  redirect('/dashboard')
}
