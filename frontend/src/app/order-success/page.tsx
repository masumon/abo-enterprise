'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ordersApi } from '@/lib/api';
import { WHATSAPP_NUMBER, generateWhatsAppOrderMessage } from '@/lib/utils';

interface OrderData {
  order_id: string;
  order_number: string;
}

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('id');
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      router.push('/');
      return;
    }

    async function fetchOrder() {
      try {
        const response = await ordersApi.getOrder(orderId);
        if (response.success && response.data) {
          setOrder(response.data);
        } else {
          router.push('/');
        }
      } catch (error) {
        console.error('Error fetching order:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [orderId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your order...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center">
          <p className="text-gray-600">Order not found.</p>
          <Link href="/" className="text-brand-500 hover:underline mt-4 inline-block">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const whatsappMessage = `Hello! My order number is ${order.order_number}. Could you please provide me with the delivery update?`;
  const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4 animate-bounce">
            <span className="text-white text-3xl">✓</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Order Confirmed!
          </h1>
          <p className="text-lg text-gray-600">
            Thank you for your order. We'll process it shortly.
          </p>
        </div>

        {/* Order Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="border-b pb-6 mb-6">
            <p className="text-gray-600 text-sm mb-2">Order Number</p>
            <p className="text-2xl font-bold text-brand-500">{order.order_number}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div>
              <p className="text-gray-600 text-sm mb-1">Status</p>
              <div className="badge badge-hot">Pending</div>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-1">Confirmation</p>
              <p className="text-gray-900 font-semibold">Check your email</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              <strong>📧 Important:</strong> We've sent a confirmation email with order details. Please check your inbox.
            </p>
          </div>

          {/* WhatsApp Contact */}
          <div className="flex gap-4">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 btn btn-primary bg-green-500 hover:bg-green-600 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.272-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-5.031 1.378c-3.055 2.116-4.797 5.864-4.797 10.6 0 5.487 3.636 10.404 8.987 11.732.556.164 1.122.196 1.671.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m5.421 7.403c-.297-.149-1.758-.867-2.03-.967-.272-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
              </svg>
              Chat on WhatsApp
            </a>
            <Link
              href="/products"
              className="flex-1 btn btn-outline flex items-center justify-center"
            >
              Continue Shopping
            </Link>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">What happens next?</h3>
          <ol className="space-y-3">
            <li className="flex gap-3">
              <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-brand-500 text-white text-sm font-semibold">1</span>
              <span className="text-gray-700">We will confirm your order via WhatsApp or email within 2 hours</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-brand-500 text-white text-sm font-semibold">2</span>
              <span className="text-gray-700">Your order will be packed and prepared for delivery</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-brand-500 text-white text-sm font-semibold">3</span>
              <span className="text-gray-700">You will receive delivery updates via WhatsApp</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
