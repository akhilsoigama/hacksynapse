import React from 'react';
import { ICertificate } from '@/services/certificateService';

interface RuralSparkCertificateProps {
  certificate: ICertificate;
  scale?: number;
  className?: string;
  id?: string;
}

export const RuralSparkCertificate: React.FC<RuralSparkCertificateProps> = ({
  certificate,
  className = '',
  id = 'ruralspark-certificate-node',
}) => {
  return (
    <div
      id={id}
      className={`relative w-full max-w-[1000px] aspect-[1.414/1] bg-white text-slate-800 shadow-2xl rounded-sm overflow-hidden select-none print:shadow-none print:m-0 print:w-full print:max-w-none print:h-screen print:rounded-none font-sans ${className}`}
      style={{
        boxSizing: 'border-box',
      }}
    >
      {/* Background Tech Hexagon & Circuit Graphic Watermark */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.045]"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1000 707"
        fill="none"
      >
        <pattern id="cert-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#003366" strokeWidth="0.5" />
        </pattern>
        <rect width="1000" height="707" fill="url(#cert-grid)" />
        {/* Hexagons in corners */}
        <path d="M 850 120 L 890 140 L 890 180 L 850 200 L 810 180 L 810 140 Z" stroke="#003366" strokeWidth="1.5" />
        <path d="M 890 180 L 930 200 L 930 240 L 890 260 L 850 240 L 850 200 Z" stroke="#003366" strokeWidth="1.5" />
        <path d="M 810 180 L 850 200 L 850 240 L 810 260 L 770 240 L 770 200 Z" stroke="#003366" strokeWidth="1.5" />
        <circle cx="850" cy="200" r="4" fill="#003366" />
        <circle cx="890" cy="180" r="4" fill="#003366" />
        <circle cx="810" cy="180" r="4" fill="#003366" />
      </svg>

      {/* Subtle Book Watermark on Left */}
      <div className="absolute left-[10%] top-[30%] pointer-events-none opacity-[0.06]">
        <svg width="90" height="70" viewBox="0 0 24 24" fill="none" stroke="#003366" strokeWidth="1.2">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      </div>

      {/* Top Right Ribbon / Bookmark */}
      <div className="absolute right-[4.5%] top-0 z-10">
        <svg width="84" height="170" viewBox="0 0 84 170" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Orange border ribbon */}
          <path
            d="M2 0 H82 V155 L42 135 L2 155 Z"
            fill="#ea580c"
            opacity="0.9"
          />
          {/* Main Blue Ribbon */}
          <path
            d="M5 0 H79 V148 L42 130 L5 148 Z"
            fill="#0f3d99"
          />
          {/* Golden Ribbon accent lines */}
          <path d="M8 0 V144 L42 127 L76 144 V0" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.7" fill="none" />
          {/* Circular Badge */}
          <circle cx="42" cy="78" r="26" fill="white" stroke="#f59e0b" strokeWidth="2.5" />
          <circle cx="42" cy="78" r="23" fill="#0f3d99" />
          {/* Laurel Wreath inside badge */}
          <path d="M28 78 C28 86 35 91 42 91 C49 91 56 86 56 78" stroke="#f59e0b" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M30 73 C30 77 33 80 37 83" stroke="#f59e0b" strokeWidth="1.5" fill="none" />
          <path d="M54 73 C54 77 51 80 47 83" stroke="#f59e0b" strokeWidth="1.5" fill="none" />
          {/* Graduation Cap Icon */}
          <path d="M33 72 L42 67 L51 72 L42 77 Z" fill="white" />
          <path d="M37 75 V81 C37 83.5 47 83.5 47 81 V75" fill="white" />
          <path d="M50 72 V82" stroke="white" strokeWidth="1.5" />
          <circle cx="50" cy="83" r="1.5" fill="#f59e0b" />
        </svg>
      </div>

      {/* Top Left: RuralSpark Brand Header */}
      <div className="absolute left-[5%] top-[5.5%] flex items-center gap-3.5 z-10">
        {/* Custom RuralSpark Logo Badge */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-12 h-12">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Green Graduation Cap over 'R' */}
              <path d="M 45 15 L 25 24 L 45 33 L 65 24 Z" fill="#16a34a" />
              <path d="M 33 28 L 33 37 C 33 42 57 42 57 37 L 57 28" fill="#16a34a" />
              <path d="M 64 24 L 64 36" stroke="#16a34a" strokeWidth="2.5" />
              <circle cx="64" cy="38" r="2.5" fill="#ca8a04" />
              {/* Bold R letter in dark blue */}
              <text x="18" y="72" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="56" fill="#003580">R</text>
              {/* S letter with green eco curve */}
              <text x="52" y="72" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="56" fill="#ca8a04">S</text>
              {/* Small House with eco leaf / sun curve */}
              <path d="M 12 76 L 24 66 L 36 76 V 88 H 12 Z" fill="#003580" opacity="0.8" />
              <path d="M 30 86 C 45 74 65 74 88 86" stroke="#16a34a" strokeWidth="4.5" fill="none" strokeLinecap="round" />
              <path d="M 36 91 C 50 81 70 81 88 91" stroke="#2563eb" strokeWidth="3" fill="none" strokeLinecap="round" />
            </svg>
          </div>

          <div>
            <div className="flex items-baseline">
              <span className="text-[26px] font-black tracking-tight text-[#003366] leading-none">RuralSpark</span>
              <span className="text-[#ea580c] font-black text-xl ml-0.5 leading-none">*</span>
            </div>
            <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase mt-0.5">
              AI-Powered Learning
            </p>
          </div>
        </div>
      </div>

      {/* Main Certificate Content Area */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-12 pt-16 pb-10 h-full">
        
        {/* Certificate Title */}
        <h1 className="text-[38px] sm:text-[42px] font-extrabold tracking-[0.22em] text-[#002b66] uppercase mb-1 drop-shadow-xs">
          CERTIFICATE
        </h1>

        {/* Subtitle with gold accent lines */}
        <div className="flex items-center justify-center gap-3 w-full max-w-[420px] mb-3">
          <div className="h-[1.5px] flex-1 bg-gradient-to-r from-transparent via-[#f59e0b] to-[#ea580c]" />
          <span className="text-[12px] font-bold tracking-[0.3em] text-[#002b66] uppercase">
            OF COMPLETION
          </span>
          <div className="h-[1.5px] flex-1 bg-gradient-to-l from-transparent via-[#f59e0b] to-[#ea580c]" />
        </div>

        {/* Presentation line */}
        <p className="text-[13px] font-medium text-slate-500 tracking-wide mt-1 mb-1">
          This certificate is proudly presented to
        </p>

        {/* Student Name in Script Calligraphy */}
        <div className="my-1 py-1">
          <span
            className="text-[44px] sm:text-[50px] text-[#003882] font-normal leading-tight select-text"
            style={{
              fontFamily: "'Dancing Script', 'Alex Brush', 'Great Vibes', 'Brush Script MT', 'Segoe Script', cursive",
              letterSpacing: '0.02em',
              textShadow: '0 1px 2px rgba(0, 43, 102, 0.1)',
            }}
          >
            {certificate.studentName || 'Student Name'}
          </span>
          {/* Subtle underline with center diamond accent */}
          <div className="flex items-center justify-center gap-2 -mt-1 mb-1">
            <div className="w-44 h-[1px] bg-gradient-to-r from-transparent to-[#003882]/40" />
            <div className="w-1.5 h-1.5 rotate-45 bg-[#003882]" />
            <div className="w-44 h-[1px] bg-gradient-to-l from-transparent to-[#003882]/40" />
          </div>
        </div>

        {/* Course Completion Announcement */}
        <p className="text-[12px] font-medium text-slate-500 mb-1">
          for successfully completing the course
        </p>

        {/* Course Title with Golden Laurel Wreaths */}
        <div className="flex items-center justify-center gap-4 my-1">
          {/* Left Laurel Wreath SVG */}
          <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#ea580c]">
            <path d="M28 39 C16 34 8 24 9 10" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M12 13 C8 14 6 11 6 8 C9 8 11 10 12 13 Z" fill="#ea580c" />
            <path d="M10 20 C6 21 4 18 5 15 C8 15 9 17 10 20 Z" fill="#ea580c" />
            <path d="M11 27 C7 28 5 25 7 22 C10 22 10 24 11 27 Z" fill="#ea580c" />
            <path d="M15 33 C11 34 9 32 11 29 C14 29 14 31 15 33 Z" fill="#ea580c" />
            <path d="M22 38 C18 39 16 37 18 34 C21 34 21 36 22 38 Z" fill="#ea580c" />
          </svg>

          {/* Bold Course Title */}
          <h2 className="text-[28px] sm:text-[32px] font-extrabold text-[#002b66] tracking-tight">
            {certificate.courseTitle || 'Course Title'}
          </h2>

          {/* Right Laurel Wreath SVG */}
          <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#ea580c] scale-x-[-1]">
            <path d="M28 39 C16 34 8 24 9 10" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M12 13 C8 14 6 11 6 8 C9 8 11 10 12 13 Z" fill="#ea580c" />
            <path d="M10 20 C6 21 4 18 5 15 C8 15 9 17 10 20 Z" fill="#ea580c" />
            <path d="M11 27 C7 28 5 25 7 22 C10 22 10 24 11 27 Z" fill="#ea580c" />
            <path d="M15 33 C11 34 9 32 11 29 C14 29 14 31 15 33 Z" fill="#ea580c" />
            <path d="M22 38 C18 39 16 37 18 34 C21 34 21 36 22 38 Z" fill="#ea580c" />
          </svg>
        </div>

        {/* Commitment Paragraph */}
        <p className="text-[11px] sm:text-[12px] text-slate-600 max-w-[560px] leading-relaxed mb-4">
          has successfully completed the required learning activities and demonstrated commitment to developing new skills through <span className="font-bold text-[#002b66]">RuralSpark</span>.
        </p>

        {/* 4-Item Rounded Info Card Pill */}
        <div className="w-full max-w-[620px] bg-slate-50/90 border border-slate-200/90 rounded-2xl py-2 px-3 shadow-xs mb-6 backdrop-blur-xs">
          <div className="grid grid-cols-4 divide-x divide-slate-200 text-center">
            
            {/* Student Name */}
            <div className="flex flex-col items-center px-2">
              <div className="w-6 h-6 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-700 mb-1">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-[9px] uppercase tracking-wider text-slate-600 font-bold">Student Name</span>
              <span className="text-[11px] font-bold text-slate-800 truncate max-w-full">
                {certificate.studentName}
              </span>
            </div>

            {/* Course */}
            <div className="flex flex-col items-center px-2">
              <div className="w-6 h-6 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-700 mb-1">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                </svg>
              </div>
              <span className="text-[9px] uppercase tracking-wider text-slate-600 font-bold">Course</span>
              <span className="text-[11px] font-bold text-slate-800 truncate max-w-full">
                {certificate.courseTitle}
              </span>
            </div>

            {/* Completion Date */}
            <div className="flex flex-col items-center px-2">
              <div className="w-6 h-6 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-700 mb-1">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-[9px] uppercase tracking-wider text-slate-600 font-bold">Completion Date</span>
              <span className="text-[11px] font-bold text-slate-800">
                {certificate.completionDate || certificate.issueDate}
              </span>
            </div>

            {/* Certificate ID */}
            <div className="flex flex-col items-center px-2">
              <div className="w-6 h-6 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-700 mb-1">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-[9px] uppercase tracking-wider text-slate-600 font-bold">Certificate ID</span>
              <span className="text-[10px] font-mono font-bold text-slate-800">
                {certificate.id}
              </span>
            </div>

          </div>
        </div>

        {/* Bottom Section: Left Signature | Center Official Seal | Right Signature */}
        <div className="w-full max-w-[700px] grid grid-cols-3 items-end justify-between mt-auto pt-1">
          
          {/* Left Signature: Instructor */}
          <div className="flex flex-col items-center text-center">
            {/* Realistic Cursive Signature SVG */}
            <svg className="w-32 h-10 mb-1" viewBox="0 0 160 50" fill="none">
              <path
                d="M 15 38 C 25 15, 30 10, 38 25 C 45 40, 48 30, 58 20 C 65 12, 70 32, 80 24 C 90 16, 95 32, 105 28 C 115 24, 125 35, 145 22"
                stroke="#1e293b"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 30 25 L 140 28"
                stroke="#1e293b"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            <div className="w-36 h-[1.5px] bg-[#002b66] mb-1" />
            <span className="text-[9px] font-extrabold tracking-wider text-[#002b66] uppercase">
              INSTRUCTOR / COURSE MENTOR
            </span>
          </div>

          {/* Center: Official Blue Circular Seal Badge */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
                {/* Outer scalloped circle */}
                <path
                  d="M 50 2 
                     A 48 48 0 1 0 50 98 
                     A 48 48 0 1 0 50 2"
                  fill="#002b66"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="3, 2"
                />
                <circle cx="50" cy="50" r="41" fill="#002b66" stroke="white" strokeWidth="1.5" />
                <circle cx="50" cy="50" r="38" fill="#002b66" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2, 2" />

                {/* Curved Path for Text: LEARN • GROW • EMPOWER */}
                <path id="seal-curve-top" d="M 18 50 A 32 32 0 0 1 82 50" fill="none" />
                <path id="seal-curve-bottom" d="M 82 50 A 32 32 0 0 1 18 50" fill="none" />

                <text fill="white" fontSize="7.5" fontWeight="800" letterSpacing="2.5">
                  <textPath href="#seal-curve-top" startOffset="50%" textAnchor="middle">
                    LEARN • GROW
                  </textPath>
                </text>
                <text fill="white" fontSize="7.5" fontWeight="800" letterSpacing="2.5">
                  <textPath href="#seal-curve-bottom" startOffset="50%" textAnchor="middle">
                    EMPOWER
                  </textPath>
                </text>

                {/* Center Star & Book */}
                <polygon points="50,37 53,44 60,45 55,49 57,56 50,52 43,56 45,49 40,45 47,44" fill="#f59e0b" />
                <path d="M 42 62 C 46 60 50 61 50 63 C 50 61 54 60 58 62 V 57 C 54 55 50 56 50 58 C 50 56 46 55 42 57 Z" fill="white" />
              </svg>
            </div>
          </div>

          {/* Right Signature: Authorized Signatory */}
          <div className="flex flex-col items-center text-center">
            {/* Realistic Cursive Signature SVG */}
            <svg className="w-32 h-10 mb-1" viewBox="0 0 160 50" fill="none">
              <path
                d="M 20 40 C 25 15, 35 12, 45 28 C 55 42, 65 18, 78 22 C 90 26, 105 14, 120 28 C 130 36, 140 22, 148 20"
                stroke="#1e293b"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 40 20 Q 80 42 145 25"
                stroke="#1e293b"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            <div className="w-36 h-[1.5px] bg-[#002b66] mb-1" />
            <span className="text-[9px] font-extrabold tracking-wider text-[#002b66] uppercase">
              RURALSPARK AUTHORIZED SIGNATORY
            </span>
          </div>

        </div>

      </div>

      {/* Modern Bottom-Left Geometric Corners */}
      <div className="absolute left-0 bottom-0 pointer-events-none z-0">
        <svg width="220" height="220" viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Micro Dot Grid */}
          <g fill="#0f3d99" opacity="0.35">
            <circle cx="15" cy="180" r="2" />
            <circle cx="27" cy="180" r="2" />
            <circle cx="39" cy="180" r="2" />
            <circle cx="51" cy="180" r="2" />
            <circle cx="15" cy="192" r="2" />
            <circle cx="27" cy="192" r="2" />
            <circle cx="39" cy="192" r="2" />
            <circle cx="51" cy="192" r="2" />
            <circle cx="15" cy="204" r="2" />
            <circle cx="27" cy="204" r="2" />
            <circle cx="39" cy="204" r="2" />
            <circle cx="51" cy="204" r="2" />
          </g>
          {/* Layered Angled Navy Polygons */}
          <path d="M 0 110 L 140 220 H 0 Z" fill="#0b2866" />
          <path d="M 0 145 L 95 220 H 0 Z" fill="#001844" />
          {/* Vibrant Blue polygon layer */}
          <path d="M -20 180 L 175 220 L 70 120 Z" fill="#1d4ed8" opacity="0.9" />
          {/* Sharp Orange Polygon Accent */}
          <path d="M 55 175 L 125 220 L 85 220 Z" fill="#ea580c" />
        </svg>
      </div>

      {/* Modern Bottom-Right Geometric Corners */}
      <div className="absolute right-0 bottom-0 pointer-events-none z-0">
        <svg width="240" height="240" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Vibrant Orange Large Polygon */}
          <path d="M 240 100 L 130 240 H 240 Z" fill="#f97316" />
          {/* Sharp Navy Blue Corner Triangle */}
          <path d="M 240 160 L 180 240 H 240 Z" fill="#002255" />
          {/* Micro accent cut */}
          <path d="M 160 215 L 210 240 L 145 240 Z" fill="#ea580c" />
        </svg>
      </div>

    </div>
  );
};
export default RuralSparkCertificate;
