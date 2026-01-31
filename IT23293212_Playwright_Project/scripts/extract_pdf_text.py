from __future__ import annotations

from pathlib import Path

from pypdf import PdfReader


def extract_pdf_text(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    parts: list[str] = []

    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        parts.append(f"\n\n===== PAGE {i + 1} =====\n{text}")

    return "".join(parts)


def main() -> None:
    pdf_path = Path(r"C:\Users\Viman Kavinda\Downloads\Assignment 1 (1).pdf")
    out_path = Path(__file__).resolve().parents[1] / "debug" / "assignment_requirements.txt"

    out_path.parent.mkdir(parents=True, exist_ok=True)

    text = extract_pdf_text(pdf_path)
    out_path.write_text(text, encoding="utf-8", errors="ignore")

    print(f"Wrote: {out_path}")
    print(f"Pages: {len(PdfReader(str(pdf_path)).pages)}")
    print(f"Extracted chars: {len(text)}")


if __name__ == "__main__":
    main()
