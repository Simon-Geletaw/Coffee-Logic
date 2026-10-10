'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { verifyChapaPayment } from '@/lib/api';

export default function ReturnClient() {
  const searchParams = useSearchParams();
  const txRef = searchParams.get('tx_ref');

  const verify = useQuery({
    queryKey: ['chapa-verify', txRef],
    queryFn: () => verifyChapaPayment(txRef as string),
    enabled: Boolean(txRef),
    // A slow webhook can lag a beat behind Chapa; re-check a few times.
    refetchInterval: (query) =>
      query.state.data?.status === 'pending' ? 3000 : false,
    retry: 2,
  });

  const status = txRef ? verify.data?.status : 'unknown';

  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center bg-cream-soft pt-32 md:pt-40"
    >
      <div className="mx-auto w-full max-w-xl px-6 text-center">
        {!txRef || status === 'unknown' ? (
          <>
            <XCircle size={40} className="mx-auto text-[#A6402C]" aria-hidden />
            <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl text-[#2E2A20]">
              We lost track of that payment
            </h1>
            <p className="mt-4 text-sm leading-7 text-[#5A5346]">
              We could not match this payment to an order. If you were charged,
              contact us with your transaction reference and we will sort it
              out.
            </p>
          </>
        ) : status === 'paid' ? (
          <>
            <CheckCircle2
              size={40}
              className="mx-auto text-[#3E6B3A]"
              aria-hidden
            />
            <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl text-[#2E2A20]">
              Payment confirmed
            </h1>
            <p className="mt-4 text-sm leading-7 text-[#5A5346]">
              Thank you — your order is paid and being prepared. A confirmation
              will follow to your email.
            </p>
            {verify.data?.orderId ? (
              <Link
                href={`/orders/${verify.data.orderId}`}
                className="mt-8 inline-flex items-center gap-2 border border-[#B08A3E] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6E5518] transition-colors hover:bg-[#B08A3E]/12"
              >
                View order
              </Link>
            ) : null}
          </>
        ) : status === 'failed' ? (
          <>
            <XCircle size={40} className="mx-auto text-[#A6402C]" aria-hidden />
            <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl text-[#2E2A20]">
              That didn&apos;t go through
            </h1>
            <p className="mt-4 text-sm leading-7 text-[#5A5346]">
              The payment did not complete. You can try again from your cart —
              nothing was charged.
            </p>
          </>
        ) : (
          <>
            <Loader2
              size={40}
              className="mx-auto animate-spin text-[#B08A3E]"
              aria-hidden
            />
            <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl text-[#2E2A20]">
              Checking your payment…
            </h1>
            <p className="mt-4 text-sm leading-7 text-[#5A5346]">
              This only takes a moment. Do not close this page.
            </p>
          </>
        )}

        <Link
          href="/shop"
          className="mt-10 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-[#8A7F6A] transition-colors hover:text-[#2E2A20]"
        >
          <ArrowLeft size={14} aria-hidden />
          Continue shopping
        </Link>
      </div>
    </main>
  );
}