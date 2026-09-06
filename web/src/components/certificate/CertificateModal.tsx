import React, { useRef } from 'react';
import { Close, Print, Share, CheckCircle } from '@mui/icons-material';
import { toast } from 'sonner';
import { ICertificate } from '@/services/certificateService';
import { RuralSparkCertificate } from './RuralSparkCertificate';

interface CertificateModalProps {
  certificate: ICertificate | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  certificate,
  isOpen,
  onClose,
}) => {
  const certContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !certificate) return null;

  const handlePrintOrDownload = () => {
    // Print window with tailored landscape media queries
    window.print();
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(certificate.id);
    toast.success(`Certificate ID copied: ${certificate.id}`);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `${certificate.studentName}'s Certificate of Completion`,
          text: `I've successfully completed the ${certificate.courseTitle} course on RuralSpark with a score of ${certificate.score}%!`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      handleCopyId();
    }
  };

  return (
    <>
      {/* Global Print Style for Certificate */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }
          body * {
            visibility: hidden !important;
          }
          #print-certificate-wrapper,
          #print-certificate-wrapper * {
            visibility: visible !important;
          }
          #print-certificate-wrapper {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: white !important;
            z-index: 999999 !important;
          }
          #ruralspark-certificate-node {
            width: 100% !important;
            max-width: 100% !important;
            height: 100% !important;
            max-height: 100vh !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
        <div className="relative max-w-5xl w-full bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh]">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700 bg-slate-800/80">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle fontSize="small" />
              </span>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Official Certificate of Completion
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                    {certificate.score}% Score
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Issued to <strong className="text-slate-200">{certificate.studentName}</strong> for <strong className="text-slate-200">{certificate.courseTitle}</strong>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintOrDownload}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md transition-all active:scale-95"
                title="Print or Save as PDF"
              >
                <Print fontSize="small" className="w-4 h-4" />
                <span>Print / Download PDF</span>
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-all"
                title="Share Certificate"
              >
                <Share fontSize="small" className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors ml-1"
                aria-label="Close"
              >
                <Close fontSize="small" />
              </button>
            </div>
          </div>

          {/* Certificate Display Area */}
          <div
            ref={certContainerRef}
            className="flex-1 overflow-auto p-4 sm:p-8 bg-slate-950/80 flex items-center justify-center min-h-[420px]"
          >
            <div id="print-certificate-wrapper" className="w-full max-w-[920px] flex items-center justify-center">
              <RuralSparkCertificate certificate={certificate} />
            </div>
          </div>

          {/* Footer Bar */}
          <div className="px-5 py-2.5 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span>Certificate ID:</span>
              <button
                onClick={handleCopyId}
                className="font-mono text-sky-400 hover:text-sky-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 transition-colors cursor-pointer"
                title="Click to copy ID"
              >
                {certificate.id} 📋
              </button>
            </div>
            <div>
              Verified by <span className="font-semibold text-slate-300">RuralSpark Academy</span> • {certificate.issueDate}
            </div>
          </div>

        </div>
      </div>
    </>
  );
};
export default CertificateModal;
