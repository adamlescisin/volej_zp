'use client';

export function DeletePracticesButton() {
  return (
    <button
      type="submit"
      className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
      onClick={(e) => {
        if (!confirm('Smazat vybrané tréninky? Tato akce je nevratná.')) e.preventDefault();
      }}
    >
      Smazat vybrané
    </button>
  );
}
