"use client";

import { useState } from "react";
import Link from "next/link";
import { formatIndianShortPrice } from "@/lib/format";

export function AcresEmiCalculator() {
  const [loanAmount, setLoanAmount] = useState(5000000); // 50 Lakhs
  const [interestRate, setInterestRate] = useState(8.5); // 8.5%
  const [tenureYears, setTenureYears] = useState(20); // 20 years

  // Calculate EMI
  const monthlyRate = interestRate / 12 / 100;
  const totalMonths = tenureYears * 12;
  const emi = Math.round(
    (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
      (Math.pow(1 + monthlyRate, totalMonths) - 1)
  );

  const totalPayment = emi * totalMonths;
  const totalInterest = totalPayment - loanAmount;
  const principalRatio = Math.round((loanAmount / totalPayment) * 100);
  const interestRatio = 100 - principalRatio;

  return (
    <section className="bg-slate-50 border-y border-slate-200/80 py-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-[#0054a6] px-3.5 py-1 text-[11px] font-black uppercase tracking-wider">
            📊 99acres Financial Tools
          </span>
          <h2 className="mt-3 text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Home Loan & EMI Calculator
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 font-medium">
            Calculate your estimated monthly installment and plan your real estate purchase with ease.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-sm">
          {/* Left Controls: Sliders */}
          <div className="lg:col-span-7 space-y-6">
            {/* Slider 1: Loan Amount */}
            <div>
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-700 mb-2">
                <span>Loan Amount</span>
                <span className="text-[#0054a6] font-extrabold text-base sm:text-lg">
                  {formatIndianShortPrice(loanAmount)}
                </span>
              </div>
              <input
                type="range"
                min={500000}
                max={50000000}
                step={100000}
                value={loanAmount}
                onChange={(e) => setLoanAmount(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0054a6]"
              />
              <div className="flex justify-between text-[11px] font-semibold text-slate-400 mt-1">
                <span>₹ 5 Lakh</span>
                <span>₹ 2.5 Cr</span>
                <span>₹ 5.0 Cr</span>
              </div>
            </div>

            {/* Slider 2: Interest Rate */}
            <div>
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-700 mb-2">
                <span>Annual Interest Rate (%)</span>
                <span className="text-[#0054a6] font-extrabold text-base sm:text-lg">
                  {interestRate}% p.a.
                </span>
              </div>
              <input
                type="range"
                min={6.5}
                max={15.0}
                step={0.1}
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0054a6]"
              />
              <div className="flex justify-between text-[11px] font-semibold text-slate-400 mt-1">
                <span>6.5%</span>
                <span>10.0%</span>
                <span>15.0%</span>
              </div>
            </div>

            {/* Slider 3: Loan Tenure */}
            <div>
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-700 mb-2">
                <span>Loan Tenure (Years)</span>
                <span className="text-[#0054a6] font-extrabold text-base sm:text-lg">
                  {tenureYears} Years ({totalMonths} Months)
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={30}
                step={1}
                value={tenureYears}
                onChange={(e) => setTenureYears(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0054a6]"
              />
              <div className="flex justify-between text-[11px] font-semibold text-slate-400 mt-1">
                <span>5 Yrs</span>
                <span>15 Yrs</span>
                <span>30 Yrs</span>
              </div>
            </div>

            {/* Visual Split Bar */}
            <div className="pt-2">
              <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[#0054a6]" />
                  Principal: {principalRatio}%
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                  Interest: {interestRatio}%
                </span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${principalRatio}%` }}
                  className="bg-[#0054a6] transition-all duration-300"
                />
                <div
                  style={{ width: `${interestRatio}%` }}
                  className="bg-amber-400 transition-all duration-300"
                />
              </div>
            </div>
          </div>

          {/* Right Summary Card */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#003b6d] to-[#005ea6] rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-blue-200 uppercase tracking-widest">
                Monthly Loan Repayment
              </span>
              <div className="mt-2 text-3xl sm:text-4xl font-black text-amber-300 tracking-tight">
                ₹ {emi.toLocaleString("en-IN")}
                <span className="text-sm font-semibold text-blue-100"> / month</span>
              </div>

              <div className="mt-6 space-y-3 border-t border-white/20 pt-4 text-xs sm:text-sm">
                <div className="flex justify-between font-semibold">
                  <span className="text-blue-200">Principal Amount:</span>
                  <span className="font-bold text-white">
                    ₹ {loanAmount.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-blue-200">Total Interest Payable:</span>
                  <span className="font-bold text-amber-300">
                    ₹ {totalInterest.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between font-semibold border-t border-white/10 pt-2 text-sm sm:text-base">
                  <span className="text-white">Total Amount Payable:</span>
                  <span className="font-black text-white">
                    ₹ {totalPayment.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/20">
              <Link
                href="/register"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.98] px-4 py-3 text-xs sm:text-sm font-black text-slate-950 shadow-md transition"
              >
                <span>Get Instant Home Loan Advice</span>
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 stroke-[2.5]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <p className="mt-2 text-[10px] text-center text-blue-200 font-medium">
                Lowest interest rates starting at 8.35% from premier banking partners.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
