"use client";
import { useEffect } from "react";
import { useCart } from "./CartContext";

/** Po uspešnem plačilu izprazni košarico. */
export default function ClearCart() {
  const { clearCart } = useCart();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { clearCart(); }, []);
  return null;
}
