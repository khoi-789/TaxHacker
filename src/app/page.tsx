"use client";

import { useState } from "react";
import { 
  Upload, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Download, 
  HelpCircle, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut,
  Maximize2,
  Copy
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { analyzeImage } from "@/lib/gemini";

interface OCRItem {
  name: string;
  packaging?: string;
  batch?: string;
  expiry?: string;
  quantity: number;
}

interface OCRData {
  merchant: string;
  date?: string;
  invoiceNo?: string;
  items: OCRItem[];
}

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [vendor, setVendor] = useState("DEFAULT");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<OCRData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [isCopied, setIsCopied] = useState(false);

  const instructions = [
    "https://drive.google.com/thumbnail?id=1nqUP8HZ0IfMtZXHeu8Y92M5RNa5jaxEC&sz=w1000",
    "https://drive.google.com/thumbnail?id=1CVRG--N4Zfki4y_VmYTmRdw7Y32O7Qrc&sz=w1000",
    "https://drive.google.com/thumbnail?id=1wm0MJIPUAyV3H80gw_OK0QLZWA5Au6eP&sz=w1000",
    "https://drive.google.com/thumbnail?id=1xg44PINLqyRq5AI2Dt2Yp8OT_ytSXO84&sz=w1000",
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
      setResult(null);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
    }
  };

  const handleProcess = async () => {
    if (!file || !preview) return;
    if (!apiKey) {
      setError("Vui lòng nhập Google API Key để tiếp tục");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null); 

    try {
      const base64 = preview.split(",")[1];
      const mimeType = file.type;

      // Direct client-side call to Google Gemini API
      const data = await analyzeImage(base64, mimeType, apiKey, vendor);

      setResult(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!result) return;
    const commonInfo = [
      ["Nha Cung Cap", result.merchant],
      ["So Hoa Don", result.invoiceNo || ""],
      ["Ngay Hoa Don", result.date || ""],
      [""],
      ["Ten San Pham", "Quy cach", "So Lo", "Han Dung", "So Luong"]
    ];
    const rows = result.items.map(item => [
      `"${item.name}"`, 
      `"${item.packaging || ""}"`,
      `"${item.batch || ""}"`, 
      `"${item.expiry || ""}"`, 
      item.quantity
    ]);
    const csvContent = [...commonInfo, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const vendorName = vendor === "DEFAULT" ? (result.merchant?.split(" ")[0] || "INVOICE") : vendor;
    const fileName = `${vendorName} - ${result.invoiceNo || "No"}.csv`;
    link.setAttribute("download", fileName);
    link.click();
  };

  const handleCopyTable = () => {
    if (!result) return;
    // Header for TSV (Excel compatible)
    const headers = ["Ten San Pham", "Quy cach", "So Lo", "Han Dung", "So Luong"].join("\t");
    const rows = result.items.map(item => [
      item.name, 
      item.packaging || "", 
      item.batch || "", 
      item.expiry || "", 
      item.quantity
    ].join("\t")).join("\n");
    
    const tsvContent = `${headers}\n${rows}`;
    navigator.clipboard.writeText(tsvContent).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const playSound = (type: "pop" | "click") => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type === "pop" ? "sine" : "square";
      osc.frequency.setValueAtTime(type === "pop" ? 400 : 800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.error("Audio error", e);
    }
  };

  return (
    <main className="min-h-screen h-screen bg-sky-50/30 text-slate-900 font-sans overflow-hidden flex flex-col">
      <div className="flex-1 w-[98%] mx-auto flex flex-col overflow-hidden p-4 group">
        <header className="sticky top-0 z-20 flex items-center justify-between bg-white px-8 py-4 rounded-3xl shadow-sm border border-sky-100 mb-6 flex-shrink-0">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-sky-400 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-100">
                <Building2 className="w-6 h-6" />
             </div>
             <div>
                <h1 className="text-2xl font-black tracking-tight text-sky-900">
                  TaxHacker <span className="text-sky-500">Internal</span>
                </h1>
                <p className="text-[10px] uppercase font-bold text-sky-400 tracking-widest">AI Pharmaceutical OCR Pipeline</p>
             </div>
          </div>
          
          <div className="hidden md:flex items-center gap-1.5 px-4 py-2 bg-sky-50 rounded-full border border-sky-100">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] font-black text-sky-600 uppercase tracking-wide">Gemini</span>
          </div>
        </header>

        <section className="flex-1 bg-white rounded-3xl shadow-xl shadow-sky-100/40 border border-sky-50 overflow-hidden flex flex-col">
          <div className="p-6 flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
            {/* Left Column: Control Panel */}
            <div className="w-full md:w-[320px] space-y-6 flex-shrink-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[13px] font-black text-sky-500 uppercase tracking-widest underline decoration-sky-100 decoration-2 underline-offset-4">
                      Google AI API Key
                    </label>
                    <button 
                      onClick={() => { playSound("pop"); setShowInstructions(true); }}
                      className="flex items-center gap-1 text-[11px] font-black text-sky-600 hover:text-sky-700 transition-colors bg-sky-50 px-2.5 py-1 rounded-full"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      HƯỚNG DẪN
                    </button>
                  </div>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-sky-100 rounded-2xl focus:ring-4 focus:ring-sky-50 focus:border-sky-400 transition-all outline-none text-sm font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-black text-sky-500 uppercase tracking-widest ml-1 underline decoration-sky-100 decoration-2 underline-offset-4">
                    Chọn Hãng / Định dạng
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-300" />
                    <select 
                      value={vendor}
                      onChange={(e) => setVendor(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-sky-100 bg-white focus:ring-2 focus:ring-sky-400 outline-none transition-all text-sm font-bold appearance-none cursor-pointer text-slate-700"
                    >
                      <option value="DEFAULT">🤖 Tự động nhận diện</option>
                      <option value="sanofi">🏥 Hãng SANOFI</option>
                      <option value="davipharm">🏥 Hãng DAVIPHARM (Đạt Vi Phú)</option>
                      <option value="hapharco">🏥 Hãng HAPHARCO (Dược Hà Nội)</option>
                      <option value="sang_pharma">🏥 Hãng SANG PHARMA</option>
                      <option value="maxxcare">🏥 Hãng MEGA (MAXXCARE)</option>
                      <option value="astrazeneca">🏥 Hãng AZ (AstraZeneca)</option>
                    </select>
                  </div>
                </div>

                <div className="relative group">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className={cn(
                      "flex flex-col items-center justify-center w-full aspect-[4/3] border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300",
                      preview 
                        ? "border-sky-200 bg-sky-50/30" 
                        : "border-sky-100 bg-sky-50/10 hover:border-sky-300 hover:bg-sky-50/50 group-hover:scale-[1.01]"
                    )}
                  >
                    {!preview ? (
                      <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                        <Upload className="w-8 h-8 text-sky-400" />
                        <p className="font-semibold text-sky-700">Tải lên hóa đơn</p>
                      </div>
                    ) : (
                      <div className="relative w-full h-full p-2 group-hover:opacity-90 transition-opacity">
                         {file?.type === "application/pdf" ? (
                            <div className="w-full h-full flex items-center justify-center bg-sky-50/20 rounded-xl">
                              <FileText className="w-16 h-16 text-sky-300" />
                            </div>
                         ) : (
                            <img src={preview} alt="Bill" className="w-full h-full object-contain rounded-xl shadow-inner" />
                         )}
                      </div>
                    )}
                  </label>
                </div>

                <button
                  onClick={() => {
                    playSound("click");
                    handleProcess();
                  }}
                  disabled={!file || isProcessing}
                  className={cn(
                    "relative w-full py-4 rounded-2xl font-bold text-lg transition-all duration-100",
                    !file || isProcessing
                      ? "bg-sky-100 text-sky-300 cursor-not-allowed"
                      : "bg-sky-400 text-white shadow-[0_6px_0_rgb(56,189,248)] hover:shadow-[0_4px_0_rgb(56,189,248)] active:shadow-none active:translate-y-[6px] hover:bg-sky-500"
                  )}
                >
                  {isProcessing ? "Đang xử lý..." : "Xử lý hóa đơn"}
                </button>

                {error && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-600 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    {error}
                  </div>
                )}
            </div>

            {/* Result Preview Section */}
            <div className="flex-1 h-full bg-sky-50/10 rounded-2xl border border-sky-50 p-6 relative flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-sky-100 scrollbar-track-transparent">
                <AnimatePresence mode="wait">
                  {isProcessing ? (
                    <motion.div 
                      key="processing"
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0 }}
                      className="h-full w-full flex flex-col items-center justify-center relative p-8"
                    >
                      {/* Animated Gadients Background */}
                      <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
                        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-300 rounded-full blur-[100px] animate-[pulse-bg_4s_infinite]" />
                        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-sky-300 rounded-full blur-[100px] animate-[pulse-bg_6s_infinite_reverse]" />
                      </div>

                      {/* Scanner Container */}
                      <div className="relative w-full max-w-[320px] aspect-[1/1.4] bg-white rounded-2xl shadow-[0_20px_50px_rgba(14,165,233,0.1)] border border-sky-50 overflow-hidden group">
                        {preview && file?.type !== "application/pdf" ? (
                          <img src={preview} alt="Scan preview" className="w-full h-full object-cover opacity-60 grayscale-[0.2]" />
                        ) : (
                          <div className="w-full h-full bg-white p-6 space-y-6 flex flex-col pt-10">
                            <div className="flex justify-between items-start">
                               <div className="space-y-2">
                                  <div className="h-6 w-32 bg-sky-50 rounded-lg animate-pulse" />
                                  <div className="h-3 w-40 bg-sky-50/50 rounded-lg" />
                               </div>
                               <div className="h-6 w-20 bg-sky-50/50 rounded-lg" />
                            </div>
                            <div className="space-y-4 pt-4">
                               {[1, 2, 3, 4, 5].map(i => (
                                  <div key={i} className="flex gap-3 items-center">
                                     <div className="w-8 h-8 bg-sky-50/50 rounded-lg flex-shrink-0" />
                                     <div className="flex-1 space-y-2">
                                        <div className="h-2.5 w-full bg-sky-50/80 rounded-full" />
                                        <div className="h-2 w-2/3 bg-sky-50/50 rounded-full" />
                                     </div>
                                     <div className="w-12 h-2.5 bg-sky-50/30 rounded-full" />
                                  </div>
                               ))}
                            </div>
                          </div>
                        )}
                        <div className="absolute left-0 w-full h-1 bg-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.8)] z-10 animate-[scan_3s_linear_infinite]">
                           <div className="absolute top-0 left-0 w-full h-[150px] bg-gradient-to-t from-sky-400/20 to-transparent translate-y-0" />
                        </div>
                      </div>
                      
                      <div className="mt-8 space-y-2 text-center z-10">
                        <h3 className="text-lg font-bold text-sky-800 animate-pulse">Máy đang quét hóa đơn...</h3>
                        <p className="text-sm text-sky-400 font-medium italic">Vui lòng đợi trong giây lát</p>
                      </div>
                    </motion.div>
                  ) : !result ? (
                    <div key="empty" className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20">
                      <FileText className="w-16 h-16 text-sky-100" />
                      <p className="text-sky-300 font-medium italic">Vui lòng tải tệp và nhấn xử lý</p>
                    </div>
                  ) : (
                    <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col">
                      {/* Row 1 & 2: Main Info (Sticky) */}
                      <div className="shrink-0 space-y-4 bg-white/80 backdrop-blur-md pb-4 z-20">
                        {/* Row 1: Status & Merchant */}
                        <div className="flex items-center justify-between gap-4 border-b border-sky-100 pb-2">
                          <div className="flex items-center gap-2 text-emerald-500 shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="font-black uppercase tracking-wider text-xs">Phân tích thành công</span>
                          </div>
                          <div className="flex-1 flex items-center justify-end gap-3 min-w-0">
                            <span className="text-xs font-black text-sky-400 uppercase tracking-widest shrink-0">Cơ sở cung cấp:</span>
                            <p className="text-base font-black text-sky-900 uppercase truncate">{result.merchant}</p>
                          </div>
                        </div>

                        {/* Row 2: Invoice Info & Export */}
                        <div className="flex items-center gap-6">
                           <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-sky-500 uppercase tracking-widest underline decoration-sky-200 decoration-2 underline-offset-4">Số HĐ:</span>
                              <span className="text-base font-bold text-sky-600">{result.invoiceNo || "---"}</span>
                           </div>
                           <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-sky-500 uppercase tracking-widest underline decoration-sky-200 decoration-2 underline-offset-4">Ngày HĐ:</span>
                              <span className="text-base font-bold text-slate-600">{result.date || "---"}</span>
                           </div>
                         <div className="ml-auto flex flex-col items-end gap-2">
                            <p className="text-[11px] font-medium text-amber-700 italic pr-1">
                              * Bảng dữ liệu giúp nhập liệu nhanh, vui lòng kiểm tra lại độ chính xác.
                            </p>
                            <div className="flex items-center gap-2">
                               <button 
                                 onClick={() => { playSound("pop"); handleCopyTable(); }}
                                 className={cn(
                                   "flex items-center justify-center p-2 rounded-xl transition-all duration-100 shadow-[0_4px_0_rgb(186,230,253)] hover:shadow-[0_2px_0_rgb(186,230,253)] active:shadow-none active:translate-y-[4px]",
                                   isCopied ? "bg-emerald-500 text-white shadow-[0_4px_0_rgb(16,185,129)]" : "bg-white border border-sky-100 text-sky-500 hover:bg-sky-50"
                                 )}
                                 title="Copy to Excel"
                               >
                                 {isCopied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                               </button>
 
                               <button 
                                 onClick={() => { playSound("pop"); handleDownloadCSV(); }}
                                 className="flex items-center gap-1.5 px-6 py-2 bg-sky-500 text-white text-[12px] font-black rounded-2xl transition-all duration-100 shadow-[0_4px_0_rgb(14,165,233)] hover:shadow-[0_2px_0_rgb(14,165,233)] active:shadow-none active:translate-y-[4px] hover:bg-sky-600"
                               >
                                 <Download className="w-4 h-4" />
                                 XUẤT CSV
                               </button>
                            </div>
                         </div>
                        </div>
                      </div>

                      {/* Row 3 & Data: Table with Sticky Header */}
                      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-sky-100 scrollbar-track-transparent">
                        <table className="w-full border-separate border-spacing-y-2 px-1">
                          <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm">
                            <tr className="text-xs text-sky-600 uppercase font-black tracking-widest">
                              <th className="text-left pb-4 pl-4 font-black">Tên Sản Phẩm</th>
                              <th className="text-center pb-4 px-2 font-black w-[160px]">Quy cách</th>
                              <th className="text-center pb-4 px-2 font-black w-[140px]">Số Lô</th>
                              <th className="text-center pb-4 px-2 font-black w-[160px]">Hạn Dùng</th>
                              <th className="text-center pb-4 pr-4 font-black w-[140px]">Số lượng</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.items.map((item, idx) => (
                              <tr key={idx} className="bg-white border border-sky-50 shadow-sm rounded-2xl hover:bg-sky-50/50 transition-colors group">
                                <td className="py-5 pl-4 font-black text-base text-slate-800 rounded-l-2xl max-w-[300px] leading-tight">
                                  {item.name}
                                </td>
                                <td className="py-5 text-base font-medium text-slate-500 italic text-center px-2">
                                  {item.packaging || "---"}
                                </td>
                                <td className="py-5 font-mono text-center text-base text-sky-500 font-bold px-2">
                                  {item.batch || "---"}
                                </td>
                                <td className="py-5 text-base font-semibold text-center text-slate-500 px-2">
                                  {item.expiry || "---"}
                                </td>
                                <td className="py-5 pr-4 text-center font-black text-lg text-sky-900 rounded-r-2xl">
                                  {item.quantity.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
            </div>
          </div>
        </section>

        <footer className="text-center py-4 flex-shrink-0">
           <p className="text-[10px] italic text-sky-300 font-medium tracking-wide">
             © Copyright Veloxis Co.
           </p>
        </footer>
      </div>

      {/* Instruction Modal */}
      <AnimatePresence>
        {showInstructions && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="relative w-full max-w-[90vw] bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh]"
            >
              <button 
                onClick={() => { playSound("pop"); setShowInstructions(false); }}
                className="absolute top-6 right-6 z-20 p-2 bg-sky-50 hover:bg-sky-100 text-sky-500 rounded-full transition-colors shadow-sm"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="w-full md:w-72 bg-sky-50/30 p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-sky-50 flex-shrink-0">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-100 text-sky-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Hướng dẫn sử dụng
                  </div>
                  <h2 className="text-2xl font-black text-sky-900 leading-tight">
                    Cách lấy Google API Key
                  </h2>
                  <div className="space-y-4">
                    {instructions.map((_, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "flex items-center gap-4 p-3 rounded-2xl border transition-all cursor-pointer",
                          currentStep === i + 1 
                            ? "bg-white border-sky-200 shadow-sm text-sky-600" 
                            : "bg-transparent border-transparent text-sky-300 hover:text-sky-500"
                        )}
                        onClick={() => { playSound("click"); setCurrentStep(i + 1); setZoom(1); }}
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold",
                          currentStep === i + 1 ? "bg-sky-500 text-white" : "bg-sky-100 text-sky-400"
                        )}>
                          {i + 1}
                        </div>
                        <span className="text-sm font-bold">Bước {i + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-sky-400 p-4 rounded-2xl text-white shadow-lg shadow-sky-100">
                   <p className="text-[10px] font-bold opacity-80 uppercase mb-1">Mẹo nhỏ</p>
                   <p className="text-xs font-medium leading-relaxed">
                     Sử dụng chuột hoặc ngón tay để kéo và phóng to hình ảnh hướng dẫn.
                   </p>
                </div>
              </div>

              {/* Image Viewer */}
              <div className="flex-1 bg-sky-50/50 relative group overflow-hidden">
                <div className="absolute inset-x-0 bottom-6 z-20 flex justify-center items-center gap-4">
                  <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-lg border border-sky-100/20">
                     <button 
                        onClick={() => { playSound("click"); setZoom(Math.max(1, zoom - 0.5)); }}
                        className="p-2 hover:bg-sky-50 rounded-full text-sky-500 transition-colors"
                     >
                        <ZoomOut className="w-5 h-5" />
                     </button>
                     <span className="text-xs font-bold w-12 text-center text-sky-600">{Math.round(zoom * 100)}%</span>
                     <button 
                        onClick={() => { playSound("click"); setZoom(Math.min(3, zoom + 0.5)); }}
                        className="p-2 hover:bg-sky-50 rounded-full text-sky-500 transition-colors"
                     >
                        <ZoomIn className="w-5 h-5" />
                     </button>
                  </div>

                  <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-lg border border-sky-100/20">
                     <button 
                        onClick={() => { if (currentStep > 1) { playSound("click"); setCurrentStep(currentStep - 1); setZoom(1); } }}
                        disabled={currentStep === 1}
                        className="p-2 hover:bg-sky-50 disabled:opacity-30 rounded-full text-sky-500 transition-colors"
                     >
                        <ChevronLeft className="w-5 h-5" />
                     </button>
                     <button 
                        onClick={() => { if (currentStep < 4) { playSound("click"); setCurrentStep(currentStep + 1); setZoom(1); } }}
                        disabled={currentStep === 4}
                        className="p-2 hover:bg-sky-50 disabled:opacity-30 rounded-full text-sky-500 transition-colors"
                     >
                        <ChevronRight className="w-5 h-5" />
                     </button>
                  </div>
                </div>

                <div className="w-full h-full flex items-center justify-center p-8 overflow-hidden touch-none">
                  <motion.img 
                    key={currentStep}
                    src={instructions[currentStep - 1]}
                    alt={`Step ${currentStep}`}
                    drag={zoom > 1}
                    dragConstraints={{ left: -100 * zoom, right: 100 * zoom, top: -100 * zoom, bottom: 100 * zoom }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: zoom }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className={cn(
                      "max-w-full max-h-full object-contain shadow-2xl rounded-lg",
                      zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                    )}
                  />
                  {zoom > 1 && (
                    <div className="absolute top-4 left-4 bg-sky-400 text-white p-2 rounded-full shadow-xl">
                      <Maximize2 className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
