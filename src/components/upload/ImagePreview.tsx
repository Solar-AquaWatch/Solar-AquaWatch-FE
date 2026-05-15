interface ImagePreviewProps {
  previewUrl: string | null;
}

export function ImagePreview({ previewUrl }: ImagePreviewProps) {
  if (!previewUrl) {
    return (
      <div className="flex h-80 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-sm font-semibold text-slate-500">
        선택한 테스트 이미지 미리보기가 여기에 표시됩니다.
      </div>
    );
  }

  return <img src={previewUrl} alt="업로드 이미지 미리보기" className="h-80 w-full rounded-lg border border-slate-200 object-cover shadow-panel" />;
}
