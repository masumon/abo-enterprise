import { Badge } from "./Badge";

export const PAYMENT_METHODS = [
  {
    code: "cod",
    name: "COD",
    label: { en: "COD ✓", bn: "COD ✓" },
    color: "bg-green-50 text-green-700 border-green-100",
  },
  {
    code: "bkash",
    name: "bKash",
    label: { en: "bKash", bn: "bKash" },
    color: "bg-pink-50 text-pink-700 border-pink-100",
  },
  {
    code: "nagad",
    name: "Nagad",
    label: { en: "Nagad", bn: "Nagad" },
    color: "bg-orange-50 text-orange-700 border-orange-100",
  },
];

interface Props {
  methods?: string[];
  size?: "sm" | "md";
}

export function PaymentMethodBadges({ methods = ["cod", "bkash", "nagad"], size = "sm" }: Props) {
  return (
    <>
      {methods.map((code) => {
        const method = PAYMENT_METHODS.find((m) => m.code === code);
        if (!method) return null;
        const sizeClass = size === "sm" ? "text-xs" : "text-sm";
        return (
          <span
            key={code}
            className={`${sizeClass} font-semibold px-2 py-0.5 rounded-full border ${method.color}`}
          >
            {method.name}
          </span>
        );
      })}
    </>
  );
}
