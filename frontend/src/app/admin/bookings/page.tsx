"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Calendar, Phone, Mail, MapPin } from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import StatusBadge from "@/components/admin/StatusBadge";

interface Booking {
  id: string;
  booking_number: string;
  service_name: string;
  customer_name: string;
  customer_phone: string;
  quoted_price?: number;
  status: string;
  created_at: string;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchBookings();
  }, [statusFilter]);

  async function fetchBookings() {
    try {
      setLoading(true);
      const params: any = { page: 1, per_page: 20 };
      if (statusFilter !== "all") params.status = statusFilter;

      const response = await api.get("/admin/bookings", { params });
      setBookings(response.data.data);
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function updateBookingStatus(bookingId: string, newStatus: string) {
    try {
      await api.patch(/admin/bookings/{bookingId}/status, { status: newStatus });
      setBookings(bookings.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b)));
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking({ ...selectedBooking, status: newStatus });
      }
    } catch (error) {
      console.error("Failed to update:", error);
      alert("Failed to update status");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Service Bookings</h1>
      {loading ? <LoadingSpinner /> : (
        bookings.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-200">
            {bookings.map((booking) => (
              <div key={booking.id} onClick={() => setSelectedBooking(booking)} className="p-4 cursor-pointer hover:bg-gray-50">
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-semibold">{booking.booking_number}</h3>
                    <p className="text-sm text-gray-600">{booking.service_name}</p>
                    <p className="text-sm">{booking.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">৳{booking.quoted_price?.toLocaleString()}</p>
                    <StatusBadge status={booking.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No bookings found</p>
        )
      )}
    </div>
  );
}
