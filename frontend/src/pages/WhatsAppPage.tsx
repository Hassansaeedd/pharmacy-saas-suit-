import React, { useState } from 'react';
import { api } from '../services/api';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  Smartphone,
  Bot,
  HelpCircle,
  Wifi
} from 'lucide-react';

export const WhatsAppPage: React.FC = () => {
  const [queryText, setQueryText] = useState('Is Panadol available in stock?');
  const [botResponse, setBotResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTestInquire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryText.trim()) return;
    setIsLoading(true);
    setBotResponse(null);
    try {
      const res = await api.post(`/whatsapp/inquire?query=${encodeURIComponent(queryText)}`);
      setBotResponse(res.data.reply);
    } catch (err) {
      console.error('Failed to query WhatsApp bot', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-green-600" /> Meta WhatsApp Cloud API Bot
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Automated customer stock inquiries & instant NLP availability checks.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 border border-green-200 text-green-700 text-xs font-bold">
          <Wifi className="w-3.5 h-3.5" />
          Meta Cloud Webhook Active
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chat Simulator */}
        <div className="lg:col-span-7 ph-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
              <Bot className="w-5 h-5 text-green-600" /> Live WhatsApp NLP Simulator
            </h3>
            <span className="text-[11px] text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">Automated NLP Bot</span>
          </div>

          {/* Chat Window */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 min-h-[280px] flex flex-col justify-between space-y-4"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2316a34a' fill-opacity='0.03' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`
            }}>
            <div className="space-y-3">
              {/* Customer message */}
              <div className="flex items-start gap-2 max-w-xs">
                <div className="w-8 h-8 rounded-full bg-green-100 border border-green-200 flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4 text-green-600" />
                </div>
                <div className="p-3 rounded-2xl rounded-tl-sm bg-white border border-gray-200 shadow-sm text-xs text-gray-700">
                  <p className="font-semibold text-green-700 text-[10px] mb-0.5 uppercase tracking-wide">Customer (WhatsApp)</p>
                  <p>{queryText || 'Querying stock...'}</p>
                </div>
              </div>

              {/* Bot response */}
              {isLoading ? (
                <div className="flex items-center gap-2 text-xs text-gray-400 pl-10">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>Bot is searching catalog...</span>
                </div>
              ) : botResponse ? (
                <div className="flex items-start gap-2 max-w-sm ml-auto flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shrink-0 shadow-md">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="p-3 rounded-2xl rounded-tr-sm bg-green-600 text-white text-xs whitespace-pre-wrap shadow-md shadow-green-500/20">
                    <p className="font-bold text-green-100 text-[10px] mb-1 uppercase tracking-wide">PharmaFlow Bot</p>
                    {botResponse}
                  </div>
                </div>
              ) : (
                <div className="text-center text-xs text-gray-400 py-6">
                  Click <strong>Send</strong> below to see the automated WhatsApp response.
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleTestInquire} className="flex gap-2 pt-3 border-t border-gray-200">
              <input
                type="text"
                placeholder="Type medicine inquiry (e.g. 'Is Brufen in stock?')..."
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-xl text-gray-700 text-xs focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-md shadow-green-500/20 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" /> Send
              </button>
            </form>
          </div>
        </div>

        {/* Webhook Details */}
        <div className="lg:col-span-5 ph-card p-5 space-y-4">
          <h3 className="font-bold text-gray-800 text-base flex items-center gap-2 border-b border-gray-100 pb-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" /> Webhook Integration Details
          </h3>

          <div className="space-y-3 text-xs text-gray-600">
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5">
              <p className="font-bold text-gray-700 text-[11px] uppercase tracking-wider">Callback URL</p>
              <code className="text-green-700 font-mono text-[11px] break-all bg-green-50 px-2 py-1 rounded-md block border border-green-100">
                https://api.pharmaflow.pk/api/v1/whatsapp/webhook
              </code>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5">
              <p className="font-bold text-gray-700 text-[11px] uppercase tracking-wider">Verify Token</p>
              <code className="text-green-700 font-mono text-[11px] bg-green-50 px-2 py-1 rounded-md block border border-green-100">
                pharmaflow_meta_verify_token_2026
              </code>
            </div>

            <div className="p-3.5 rounded-xl bg-green-50 border border-green-200 space-y-2">
              <p className="font-bold text-green-700 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                <HelpCircle className="w-3.5 h-3.5" /> Supported Queries
              </p>
              <ul className="space-y-1.5">
                {[
                  '"Is Panadol Extra available?"',
                  '"Price of Augmentin 625mg"',
                  '"Do you have Paracetamol in stock?"',
                  '"Brufen 400mg price"',
                ].map((q) => (
                  <li key={q} className="flex items-start gap-2 text-green-700">
                    <span className="text-green-500 mt-0.5">›</span>
                    <span className="font-mono text-[11px]">{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
