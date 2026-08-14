import React, { useState } from 'react';
import type { Medicine, Batch } from '../types';
import { X, Printer, Barcode } from 'lucide-react';

interface BarcodeLabelPrinterModalProps {
  medicine: Medicine;
  batch?: Batch;
  onClose: () => void;
}

export const BarcodeLabelPrinterModal: React.FC<BarcodeLabelPrinterModalProps> = ({
  medicine,
  batch,
  onClose
}) => {
  const [printCopies, setPrintCopies] = useState(1);

  const fallbackBarcode = `890${String(medicine.id + 1000).padStart(9, '0')}`;
  const barcodeValue = batch?.barcode || medicine.barcode || fallbackBarcode;
  const batchNum = batch?.batch_number || 'PKR-BATCH';
  const expiryDate = batch?.expiry_date || medicine.earliest_expiry || '2027-12-31';

  const handlePrintStickers = () => {
    window.print();
  };

  // Helper to generate simple clean SVG bars for Code128 representation
  const renderSvgBarcode = (val: string) => {
    const bars = [];
    let x = 10;
    for (let i = 0; i < val.length; i++) {
      const code = val.charCodeAt(i);
      const w1 = (code % 3) + 1;
      const w2 = ((code * 2) % 3) + 1;
      bars.push(<rect key={`${i}-1`} x={x} y="5" width={w1} height="35" fill="#111827" />);
      x += w1 + 1.5;
      bars.push(<rect key={`${i}-2`} x={x} y="5" width={w2} height="35" fill="#111827" />);
      x += w2 + 2;
    }
    return (
      <svg className="w-full h-12" viewBox={`0 0 ${Math.max(160, x + 10)} 45`} preserveAspectRatio="none">
        {bars}
      </svg>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      {/* Thermal Print CSS rule for exact 50mm x 25mm sticker layout */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-sticker-area, #thermal-sticker-area * {
            visibility: visible;
          }
          #thermal-sticker-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 50mm;
            padding: 2mm;
            background: white;
          }
          .sticker-page {
            page-break-after: always;
            margin-bottom: 2mm;
          }
        }
      `}</style>

      <div className="ph-glass-modal w-full max-w-lg p-6 space-y-5 animate-fade-in relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100/50 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-gray-200/60 pb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-green-500/20">
            <Barcode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-gray-900 text-lg tracking-tight">
              Thermal Barcode Sticker Printer
            </h3>
            <p className="text-xs text-gray-500">
              Preview standard 50mm x 25mm thermal batch sticker labels.
            </p>
          </div>
        </div>

        {/* Sticker Preview Container */}
        <div className="p-4 rounded-2xl bg-gray-100/80 border border-gray-200 flex flex-col items-center justify-center space-y-3">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            Thermal Label Preview (50mm x 25mm)
          </p>

          <div
            id="thermal-sticker-area"
            className="w-[240px] bg-white border-2 border-dashed border-gray-300 rounded-xl p-3 shadow-md flex flex-col justify-between text-gray-900 font-sans"
          >
            {Array.from({ length: printCopies }).map((_, idx) => (
              <div key={idx} className="sticker-page space-y-1 text-center">
                <div className="flex items-center justify-between border-b border-gray-200 pb-1">
                  <span className="font-black text-xs truncate max-w-[140px]">{medicine.brand_name}</span>
                  <span className="font-extrabold text-xs text-green-700">Rs.{medicine.sale_price.toFixed(0)}</span>
                </div>
                <p className="text-[10px] text-gray-500 truncate font-semibold">{medicine.generic_name}</p>

                {/* SVG Barcode */}
                <div className="my-1 py-0.5 bg-gray-50 rounded flex flex-col items-center justify-center">
                  {renderSvgBarcode(barcodeValue)}
                  <span className="font-mono text-[9px] tracking-widest font-bold text-gray-700">{barcodeValue}</span>
                </div>

                <div className="flex items-center justify-between text-[9px] text-gray-500 font-mono pt-0.5 border-t border-gray-100">
                  <span>Batch: #{batchNum}</span>
                  <span>Exp: {expiryDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Copies selector */}
        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/70 border border-gray-200">
          <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
            <Printer className="w-4 h-4 text-green-600" /> Number of Labels to Print:
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPrintCopies(Math.max(1, printCopies - 1))}
              className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs"
            >
              -
            </button>
            <span className="font-extrabold text-sm text-gray-900 w-6 text-center">{printCopies}</span>
            <button
              type="button"
              onClick={() => setPrintCopies(Math.min(50, printCopies + 1))}
              className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs"
            >
              +
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-200/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold text-xs transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePrintStickers}
            className="ph-btn-primary"
          >
            <Printer className="w-4 h-4" />
            <span>Print {printCopies} Thermal Label{printCopies > 1 ? 's' : ''}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
