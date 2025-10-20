import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Smile, CloudRain, Brain, Share2, Map, Palette, Sparkles, Sun, Feather } from "lucide-react";

/**
 * Color Walk — 讓情緒上色，幸福隨步而來
 * 單檔 React 元件（支援 Tailwind、framer-motion、recharts、shadcn/ui）
 * - 情緒文字分析 → 顏色 + 動畫視覺回饋
 * - 幸福感微行動建議（依顏色氛圍）
 * - 成就/彩虹點亮 + 每日積分
 * - 情緒色彩旅程紀錄（折線/面積圖）
 * - 文字全為繁體中文
 */

// === 假想 AI 情緒色彩模型（前端示意） ===
const EMOTION_PRESETS = {
  joy: {
    key: "joy",
    name: "快樂",
    color: "#FFD54F", // 黃色
    accent: "yellow-400",
    valence: 0.8,
    visuals: "bubbles",
    examples: ["開心", "快樂", "喜歡", "感謝", "興奮", "滿足", "幸福"],
    tasks: [
      "拍下一件讓你笑的事",
      "對自己說三句感謝",
      "把今天的高光時刻寫下來"
    ],
  },
  calm: {
    key: "calm",
    name: "平靜",
    color: "#81C784", // 綠色
    accent: "green-400",
    valence: 0.4,
    visuals: "breath",
    examples: ["平靜", "放鬆", "舒服", "安穩", "自在"],
    tasks: [
      "深呼吸 3 分鐘",
      "做一次身心掃描",
      "短走 5 分鐘，留意腳步聲"
    ],
  },
  anxious: {
    key: "anxious",
    name: "焦慮",
    color: "#90A4AE", // 藍灰
    accent: "slate-400",
    valence: -0.2,
    visuals: "ripple",
    examples: ["焦慮", "擔心", "緊張", "煩躁", "不安"],
    tasks: [
      "寫下 3 件可以掌控的小事並執行 1 件",
      "2 分鐘方形呼吸（4-4-4-4）",
      "把擔心的事拆解成三步驟"
    ],
  },
  sad: {
    key: "sad",
    name: "悲傷",
    color: "#9575CD", // 紫色
    accent: "violet-400",
    valence: -0.6,
    visuals: "raindrop",
    examples: ["難過", "失落", "悲傷", "低落", "委屈"],
    tasks: [
      "寫一封不寄出的信給自己",
      "播放一首安靜的歌並躺下 5 分鐘",
      "擁抱自己 20 秒"
    ],
  },
  neutral: {
    key: "neutral",
    name: "中性",
    color: "#BDBDBD", // 灰
    accent: "zinc-400",
    valence: 0.0,
    visuals: "glow",
    examples: ["還好", "普通", "一般", "沒特別", "中立"],
    tasks: [
      "喝一杯水並伸展 1 分鐘",
      "寫下今天最想完成的一件小事",
      "整理桌面 2 分鐘"
    ],
  },
};

function guessEmotion(text) {
  const t = text.trim();
  if (!t) return EMOTION_PRESETS.neutral;
  const lowered = t.toLowerCase();
  // 關鍵詞粗略歸類（可替換為真正 API）
  for (const preset of [EMOTION_PRESETS.joy, EMOTION_PRESETS.calm, EMOTION_PRESETS.anxious, EMOTION_PRESETS.sad]) {
    if (preset.examples.some((k) => t.includes(k))) return preset;
    // 英文備援
    if (
      (preset.key === "joy" && /happy|joy|glad|excited/.test(lowered)) ||
      (preset.key === "calm" && /calm|relax|peace/.test(lowered)) ||
      (preset.key === "anxious" && /anxious|worry|nervous/.test(lowered)) ||
      (preset.key === "sad" && /sad|down|blue/.test(lowered))
    )
      return preset;
  }
  return EMOTION_PRESETS.neutral;
}

const starterHistory = [
  { date: "10/01", emotion: "calm", value: 0.4 },
  { date: "10/02", emotion: "joy", value: 0.8 },
  { date: "10/03", emotion: "neutral", value: 0.0 },
  { date: "10/04", emotion: "anxious", value: -0.2 },
  { date: "10/05", emotion: "joy", value: 0.8 },
  { date: "10/06", emotion: "sad", value: -0.6 },
  { date: "10/07", emotion: "calm", value: 0.4 },
];

export default function App() {
  const [text, setText] = useState("");
  const [current, setCurrent] = useState(EMOTION_PRESETS.neutral);
  const [history, setHistory] = useState(starterHistory);
  const [points, setPoints] = useState(0);
  const [rainbow, setRainbow] = useState(Array(7).fill(false));
  const [taskDone, setTaskDone] = useState({});
  const [autoBreath, setAutoBreath] = useState(true);

  // 模擬分析
  const analyze = () => {
    const emo = guessEmotion(text);
    setCurrent(emo);
    const today = new Date();
    const label = `${today.getMonth() + 1}/${String(today.getDate()).padStart(2, "0")}`;
    setHistory((h) => {
      const next = [...h];
      const exist = next.find((d) => d.date === label);
      if (exist) {
        exist.value = emo.valence;
        exist.emotion = emo.key;
      } else {
        next.push({ date: label, emotion: emo.key, value: emo.valence });
      }
      return next.slice(-14); // 最近兩週
    });
  };

  // 任務完成：點亮一格彩虹 + 加分
  const completeTask = (idx) => {
    setTaskDone((prev) => ({ ...prev, [idx]: true }));
    setPoints((p) => p + 10);
    setRainbow((r) => {
      const next = [...r];
      const firstDark = next.findIndex((v) => !v);
      if (firstDark !== -1) next[firstDark] = true;
      return next;
    });
  };

  const suggestions = useMemo(() => current.tasks.map((t, i) => ({ id: `${current.key}-${i}`, text: t })), [current]);

  // === 視覺化：依情緒顯示動畫 ===
  const Visual = () => {
    const color = current.color;

    // 快樂：跳躍光點
    if (current.visuals === "bubbles") {
      return (
        <div className="relative h-48 overflow-hidden">
          {[...Array(14)].map((_, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full opacity-80"
              style={{ width: 10 + (i % 5) * 6, height: 10 + (i % 5) * 6, background: color }}
              initial={{ y: 200, x: Math.random() * 320 }}
              animate={{ y: [200, -20], x: [Math.random() * 320, Math.random() * 320] }}
              transition={{ duration: 2 + Math.random() * 1.4, repeat: Infinity, ease: "easeOut", delay: Math.random() * 0.5 }}
            />
          ))}
        </div>
      );
    }

    // 焦慮：藍灰漣漪
    if (current.visuals === "ripple") {
      return (
        <div className="relative h-48 overflow-hidden flex items-center justify-center">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border"
              style={{ width: 40, height: 40, borderColor: color }}
              animate={{ scale: [1, 6], opacity: [0.6, 0] }}
              transition={{ duration: 3 + i * 0.6, repeat: Infinity, ease: "easeOut", delay: i * 0.5 }}
            />
          ))}
        </div>
      );
    }

    // 悲傷：紫色水滴
    if (current.visuals === "raindrop") {
      return (
        <div className="relative h-48 overflow-hidden">
          {[...Array(18)].map((_, i) => (
            <motion.span
              key={i}
              className="absolute"
              style={{ width: 2, height: 14, background: current.color, left: `${(i / 18) * 100}%` }}
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: [ -30, 220], opacity: [0, 1, 0] }}
              transition={{ duration: 2 + Math.random(), repeat: Infinity, ease: "easeIn", delay: Math.random() * 1.2 }}
            />
          ))}
        </div>
      );
    }

    // 平靜：綠色呼吸
    if (current.visuals === "breath") {
      return (
        <div className="relative h-48 overflow-hidden flex items-center justify-center">
          <motion.div
            className="rounded-full"
            style={{ width: 120, height: 120, background: current.color, opacity: 0.35 }}
            animate={autoBreath ? { scale: [1, 1.12, 1] } : {}}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      );
    }

    // 中性：柔光
    return (
      <div className="relative h-48 overflow-hidden flex items-center justify-center">
        <motion.div
          className="rounded-full blur-2xl"
          style={{ width: 160, height: 160, background: current.color, opacity: 0.35 }}
          animate={{ scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    );
  };

  const chartData = useMemo(
    () => history.map((d) => ({ name: d.date, valence: d.value, color: EMOTION_PRESETS[d.emotion]?.color || "#bbb" })),
    [history]
  );

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-white to-zinc-50 text-zinc-800">
      {/* 頁首 */}
      <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-zinc-100">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-gradient-to-br from-yellow-300 via-pink-300 to-sky-300 shadow" />
            <div>
              <h1 className="font-semibold text-lg leading-tight">Color Walk — 讓情緒上色，幸福隨步而來</h1>
              <p className="text-xs text-zinc-500">以 AI 解析感受 · 轉化為色彩 · 走出你的情緒色彩旅程</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <Sun size={16} /> 自動呼吸
              <Switch checked={autoBreath} onCheckedChange={setAutoBreath} />
            </div>
            <Button variant="secondary" className="gap-2"><Share2 size={16}/> 分享</Button>
          </div>
        </div>
      </header>

      {/* 主體 */}
      <main className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左：輸入與分析 */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Brain size={18}/> 情緒色彩對話</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="用一句話描述現在的心情…（例如：今天跟朋友吃飯很開心 / 有點焦慮，擔心報告）"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-28"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={analyze} className="gap-2"><Palette size={16}/> 分析並上色</Button>
                <Button variant="outline" onClick={() => setText("")}>清空</Button>
                <Badge variant="secondary" className="ml-auto">偵測：{current.name}</Badge>
              </div>
              <Separator/>
              <div>
                <p className="text-sm text-zinc-500 mb-2">示例關鍵詞（點擊可貼上）：</p>
                <div className="flex flex-wrap gap-2">
                  {Object.values(EMOTION_PRESETS).flatMap((p) => p.examples.slice(0, 2).map((w, i) => (
                    <Button key={`${p.key}-${i}`} variant="outline" size="sm" onClick={() => setText((t) => (t ? t + "，" : "") + w)}>
                      {w}
                    </Button>
                  )))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles size={18}/> 幸福感行動建議</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-zinc-600">
                <div className="size-3 rounded-full" style={{ background: current.color }} />
                <span>當下情緒：<b className="text-zinc-800">{current.name}</b> · 建議小任務</span>
              </div>
              <ul className="space-y-2">
                {suggestions.map((s, i) => (
                  <li key={s.id} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      disabled={!!taskDone[s.id]}
                      checked={!!taskDone[s.id]}
                      onChange={() => completeTask(s.id)}
                      className="size-4"
                    />
                    <span className={`text-sm ${taskDone[s.id] ? "line-through text-zinc-400" : ""}`}>{s.text}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between text-sm text-zinc-600">
                <span>今日積分</span>
                <Badge variant="outline">{points} 分</Badge>
              </div>
              <div className="mt-2">
                <p className="text-xs text-zinc-500 mb-1">情緒彩虹 · 完成任務會點亮：</p>
                <div className="flex gap-2">
                  {rainbow.map((on, i) => (
                    <div key={i} className={`h-2 flex-1 rounded-full ${on ? "opacity-100" : "opacity-30"}`}
                         style={{ background: ["#FFD54F","#FF8A65","#81C784","#4FC3F7","#9575CD","#F48FB1","#90A4AE"][i] }} />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右：視覺回饋 + 旅程地圖 */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Smile size={18}/> 情緒與色彩回饋</CardTitle>
                <div className="flex items-center gap-3 text-sm">
                  <Badge variant="outline" className="gap-1"><Palette size={14}/> {current.name}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="rounded-2xl border bg-white/60">
                <Visual/>
              </div>
              <p className="mt-3 text-xs text-zinc-500">系統以顏色與動態呈現你的情緒氛圍（示意）。未來可接入雲端 AI/NLP 服務以獲得更精準判讀。</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Map size={18}/> 情緒色彩旅程紀錄</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="valence" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#81C784" stopOpacity={0.8} />
                        <stop offset="50%" stopColor="#BDBDBD" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#9575CD" stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis domain={[-1, 1]} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => (typeof v === "number" ? v.toFixed(2) : v)} />
                    <Area type="monotone" dataKey="valence" stroke="#6b7280" fill="url(#valence)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-zinc-600 flex-wrap">
                {Object.values(EMOTION_PRESETS).map((p) => (
                  <span key={p.key} className="inline-flex items-center gap-1">
                    <span className="size-3 rounded-full" style={{ background: p.color }} />
                    {p.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* 頁尾 */}
      <footer className="border-t border-zinc-100 mt-8">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-zinc-500 flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
          <div>
            © {new Date().getFullYear()} Color Walk · 情緒與色彩的沉浸式幸福旅程
          </div>
          <div className="flex gap-3">
            <a className="hover:underline" href="#">隱私與資料使用</a>
            <a className="hover:underline" href="#">使用說明</a>
            <a className="hover:underline" href="#">聯絡我們</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
