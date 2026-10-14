"use client";

import { useState } from "react";
import { Video } from "lucide-react";
import ImageUpload from "@/components/admin/ImageUpload";
import VideoEmbed, { isSupportedVideo } from "@/components/ui/VideoEmbed";

/** Optional video: paste a YouTube / Facebook / Vimeo link or upload a clip. */
export default function VideoUrlField({ value, onChange, folder }: { value?: string | null; onChange: (v: string) => void; folder: string }) {
  const [upload, setUpload] = useState(false);
  const v = (value ?? "").trim();
  const bad = !!v && !isSupportedVideo(v);
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
        <Video className="w-4 h-4 text-brand-600" /> ভিডিও <span className="text-gray-400 font-normal">(ঐচ্ছিক)</span>
      </label>
      <input value={v} onChange={(e) => onChange(e.target.value.trim())} inputMode="url" className="input w-full text-sm"
        placeholder="YouTube / Facebook / Vimeo ভিডিওর লিংক পেস্ট করুন" aria-label="ভিডিওর লিংক" />
      <p className="text-[11px] text-gray-500 dark:text-gray-400">
        সাইটে ছোট ছবি দেখাবে — গ্রাহক চাপলে তবেই ভিডিও চলবে, তাই পাতা ধীর হবে না।{" "}
        <button type="button" onClick={() => setUpload((u) => !u)} className="text-brand-600 hover:underline font-medium">
          {upload ? "লিংক দিয়েই রাখুন" : "অথবা ভিডিও ফাইল আপলোড করুন"}
        </button>
      </p>
      {upload && <ImageUpload value={v} onChange={(url) => { onChange(url); setUpload(false); }} folder={folder} previewSize="sm" accept="video" />}
      {bad && <p className="text-xs text-red-600">এই লিংকটি ভিডিও মনে হচ্ছে না — YouTube, Facebook, Vimeo বা আপলোড করা ভিডিওর লিংক দিন।</p>}
      {v && !bad && <div className="max-w-sm"><VideoEmbed url={v} title="ভিডিও প্রিভিউ" /></div>}
    </div>
  );
}
