import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

// ─── Data ────────────────────────────────────────────────────────────────────

const GENRES = ["Все", "Поп", "Рок", "Джаз", "Классика", "Новости", "Разговорное", "Электронная", "Ретро", "Народная"];

const DEFAULT_STATIONS = [
  { id: 1,  name: "Европа Плюс",    genre: "Поп",          freq: "106.2 FM", city: "Москва",       stream: "https://ep256.hostingradio.ru/europaplus256.mp3",      emoji: "🎵", color: "#c084fc" },
  { id: 2,  name: "Русское Радио",  genre: "Поп",          freq: "105.7 FM", city: "Москва",       stream: "https://rusradio.hostingradio.ru/rusradio96.aacp",     emoji: "🎤", color: "#f472b6" },
  { id: 3,  name: "Авторадио",      genre: "Ретро",        freq: "90.1 FM",  city: "Москва",       stream: "https://autoradio.hostingradio.ru/autoradio96.aacp",   emoji: "🚗", color: "#fb923c" },
  { id: 4,  name: "Радио Маяк",     genre: "Разговорное",  freq: "103.4 FM", city: "Москва",       stream: "https://icecast.vgtrk.cdnvideo.ru/mayk_mp3_192kbps",  emoji: "📡", color: "#60a5fa" },
  { id: 5,  name: "Радио Рекорд",   genre: "Электронная",  freq: "89.0 FM",  city: "СПб",          stream: "https://radiorecord.hostingradio.ru/rr96.aacp",        emoji: "🎧", color: "#a78bfa" },
  { id: 6,  name: "DFM",            genre: "Электронная",  freq: "101.2 FM", city: "Москва",       stream: "https://dfm.hostingradio.ru/dfm96.aacp",               emoji: "⚡", color: "#34d399" },
  { id: 7,  name: "Дорожное Радио", genre: "Поп",          freq: "96.0 FM",  city: "Москва",       stream: "https://dorognoe.hostingradio.ru/dorognoe96.aacp",     emoji: "🛣️", color: "#4ade80" },
  { id: 8,  name: "Радио Jazz",     genre: "Джаз",         freq: "89.1 FM",  city: "Москва",       stream: "https://radiojazz.hostingradio.ru/radiojazz96.aacp",   emoji: "🎷", color: "#fbbf24" },
  { id: 9,  name: "Наше Радио",     genre: "Рок",          freq: "101.7 FM", city: "Москва",       stream: "https://nashe.hostingradio.ru/nashe-320.mp3",          emoji: "🎸", color: "#f87171" },
  { id: 10, name: "Ретро FM",       genre: "Ретро",        freq: "88.0 FM",  city: "Москва",       stream: "https://retro.hostingradio.ru/retro256.mp3",           emoji: "📻", color: "#fb923c" },
  { id: 11, name: "Радио России",   genre: "Разговорное",  freq: "66.44 FM", city: "Вся Россия",   stream: "https://icecast.vgtrk.cdnvideo.ru/otr_mp3_192kbps",   emoji: "🇷🇺", color: "#60a5fa" },
  { id: 12, name: "Energy",         genre: "Электронная",  freq: "104.2 FM", city: "Москва",       stream: "https://energy.hostingradio.ru/energy96.aacp",         emoji: "💥", color: "#e879f9" },
  { id: 13, name: "Rock FM",        genre: "Рок",          freq: "95.2 FM",  city: "Москва",       stream: "https://rockfm.hostingradio.ru/rockfm96.aacp",         emoji: "🤘", color: "#f87171" },
  { id: 14, name: "Вести FM",       genre: "Новости",      freq: "97.6 FM",  city: "Москва",       stream: "https://icecast.vgtrk.cdnvideo.ru/vestifm_mp3_192kbps", emoji: "📰", color: "#94a3b8" },
  { id: 15, name: "Радио Jazz 2",   genre: "Народная",     freq: "103.4 FM", city: "Россия",       stream: "https://icecast.vgtrk.cdnvideo.ru/mayk_mp3_192kbps",  emoji: "🎻", color: "#86efac" },
  { id: 16, name: "Авторадио СПб",  genre: "Поп",          freq: "90.3 FM",  city: "СПб",          stream: "https://autoradio.hostingradio.ru/autoradio96.aacp",   emoji: "🚗", color: "#fb923c" },
];

const BANNERS = [
  { id: 1, title: "Слушай лучшие\nрадиостанции России", sub: "Прямой эфир · 16+ станций", accent: "262 83% 68%", from: "#0d0b14", via: "#140f24" },
  { id: 2, title: "Добавь свою\nлюбимую станцию", sub: "Вставь ссылку mp3, m3u или pls", accent: "220 90% 65%", from: "#090e1a", via: "#0c1528" },
  { id: 3, title: "История и\nизбранное рядом", sub: "Всё сохраняется в браузере", accent: "160 70% 55%", from: "#071410", via: "#0b1e18" },
];

type Station = typeof DEFAULT_STATIONS[0];

// ─── M3U Parser ──────────────────────────────────────────────────────────────
async function resolveStreamUrl(url: string): Promise<string> {
  const isPlaylist = /\.(m3u8?|pls)(\?|$)/i.test(url);
  if (!isPlaylist) return url;
  try {
    const res = await fetch(url, { headers: { Accept: "*/*" } });
    const text = await res.text();
    if (url.match(/\.pls/i)) {
      const match = text.match(/^File\d+=(.+)$/m);
      return match ? match[1].trim() : url;
    }
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith("#"));
    if (lines.length > 0) {
      const first = lines[0];
      if (first.startsWith("http")) return first;
      return new URL(first, new URL(url)).toString();
    }
  } catch { /* fallback */ }
  return url;
}

// ─── Wave ─────────────────────────────────────────────────────────────────────
const WaveAnimation = ({ color = "hsl(262 83% 68%)" }: { color?: string }) => (
  <div className="flex items-end gap-[2px] h-4 flex-shrink-0">
    {[8, 13, 10, 15, 9].map((h, i) => (
      <span key={i} className="wave-bar" style={{ height: h, background: color }} />
    ))}
  </div>
);

// ─── Station Card ─────────────────────────────────────────────────────────────
const StationCard = ({ station, isPlaying, isCurrentStation, onPlay, onFavorite, isFavorite }: {
  station: Station; isPlaying: boolean; isCurrentStation: boolean;
  onPlay: (s: Station) => void; onFavorite: (id: number) => void; isFavorite: boolean;
}) => (
  <div
    className={`station-card cursor-pointer group p-4 ${isCurrentStation ? "active" : ""}`}
    onClick={() => onPlay(station)}
  >
    <div className="flex items-center gap-3">
      {/* Icon */}
      <div
        className="relative w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 select-none"
        style={{ background: `${station.color}18`, boxShadow: isCurrentStation ? `0 0 16px ${station.color}40` : "none" }}
      >
        <span style={{ filter: isCurrentStation ? "drop-shadow(0 0 6px currentColor)" : "none" }}>{station.emoji}</span>
        {isCurrentStation && isPlaying && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[hsl(240_10%_4%)]" style={{ background: station.color }} />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-semibold truncate leading-tight ${isCurrentStation ? "text-white" : "text-white/90"}`}>
            {station.name}
          </p>
          {isCurrentStation && isPlaying && <WaveAnimation color={station.color} />}
        </div>
        <p className="text-xs mt-0.5 truncate" style={{ color: "hsl(240 5% 45%)" }}>
          {station.genre} · {station.freq} · {station.city}
        </p>
      </div>

      {/* Fav */}
      <button
        className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 rounded-lg hover:bg-white/5 flex-shrink-0"
        onClick={e => { e.stopPropagation(); onFavorite(station.id); }}
      >
        <Icon name="Heart" size={14} className={isFavorite ? "fill-[hsl(262_83%_68%)] text-[hsl(262_83%_68%)]" : "text-white/30"} />
      </button>
    </div>
  </div>
);

// ─── Add Station Modal ────────────────────────────────────────────────────────
const AddStationModal = ({ onClose, onAdd }: { onClose: () => void; onAdd: (s: Station) => void }) => {
  const [form, setForm] = useState({ name: "", genre: "Поп", freq: "", city: "", stream: "", emoji: "📻" });
  const emojis = ["📻", "🎵", "🎤", "🎸", "🎷", "🎺", "🎻", "🥁", "🎧", "⚡", "🔥", "🎙️", "📡", "🗣️", "🎶"];

  const handleSubmit = () => {
    if (!form.name || !form.stream) return;
    onAdd({ id: Date.now(), name: form.name, genre: form.genre, freq: form.freq || "Online", city: form.city || "Онлайн", stream: form.stream, emoji: form.emoji, color: "#c084fc" });
    onClose();
  };

  const inputCls = "w-full bg-white/5 border border-white/8 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />
      <div className="glass-strong relative rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-oswald text-xl text-white uppercase tracking-wider">Добавить станцию</h2>
            <p className="text-xs text-white/35 mt-0.5">mp3 · aac · m3u · m3u8 · pls</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all">
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <input className={inputCls} placeholder="Название станции *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <input className={inputCls} placeholder="Ссылка на поток (mp3, m3u...) *" value={form.stream} onChange={e => setForm(p => ({ ...p, stream: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <select className={inputCls + " appearance-none"} value={form.genre} onChange={e => setForm(p => ({ ...p, genre: e.target.value }))}>
              {GENRES.filter(g => g !== "Все").map(g => <option key={g} style={{ background: "#0d0b14" }}>{g}</option>)}
            </select>
            <input className={inputCls} placeholder="101.5 FM" value={form.freq} onChange={e => setForm(p => ({ ...p, freq: e.target.value }))} />
          </div>
          <input className={inputCls} placeholder="Город" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />

          <div>
            <p className="text-xs text-white/30 uppercase tracking-wide mb-2">Иконка</p>
            <div className="flex flex-wrap gap-1.5">
              {emojis.map(e => (
                <button key={e}
                  className={`w-9 h-9 rounded-xl text-lg transition-all ${form.emoji === e ? "bg-[hsl(262_83%_68%)/0.2] ring-1 ring-[hsl(262_83%_68%)/0.5]" : "bg-white/5 hover:bg-white/8"}`}
                  onClick={() => setForm(p => ({ ...p, emoji: e }))}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          className="w-full mt-5 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, hsl(262 83% 65%), hsl(220 80% 60%))", boxShadow: "0 0 20px hsl(262 83% 68% / 0.3)" }}
          onClick={handleSubmit}
        >
          Добавить станцию
        </button>
      </div>
    </div>
  );
};

// ─── Support Modal ────────────────────────────────────────────────────────────
const SupportModal = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
    <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />
    <div className="glass-strong relative rounded-2xl w-full max-w-xs p-6 mx-4 animate-scale-in" onClick={e => e.stopPropagation()}>
      <div className="text-center mb-5">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3" style={{ background: "hsl(262 83% 68% / 0.15)" }}>❤️</div>
        <h2 className="font-oswald text-xl text-white uppercase tracking-wider">Поддержать</h2>
        <p className="text-white/35 text-xs mt-1">Помогите нам развивать сервис</p>
      </div>
      <div className="space-y-2 mb-4">
        {[["100 ₽", "Чашка кофе ☕"], ["500 ₽", "Поддержка разработки"], ["1 000 ₽", "Серьёзный вклад 🚀"]].map(([amount, label]) => (
          <button key={amount} className="w-full flex items-center justify-between bg-white/5 hover:bg-white/8 border border-white/6 rounded-xl px-4 py-3 transition-all group">
            <span className="text-white font-semibold text-sm">{amount}</span>
            <span className="text-white/40 text-xs">{label}</span>
          </button>
        ))}
      </div>
      <button onClick={onClose} className="w-full py-2.5 text-xs text-white/30 hover:text-white/50 transition-colors">Закрыть</button>
    </div>
  </div>
);

// ─── Settings Panel ───────────────────────────────────────────────────────────
const SettingsPanel = ({ volume, onVolumeChange, onClose }: { volume: number; onVolumeChange: (v: number) => void; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
    <div className="glass-strong relative rounded-t-2xl w-full max-w-lg p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
      <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-5" />
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-oswald text-xl text-white uppercase tracking-wider">Настройки</h2>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all">
          <Icon name="X" size={16} />
        </button>
      </div>
      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-sm text-white/70">Громкость</span>
            <span className="text-sm font-semibold" style={{ color: "hsl(262 83% 72%)" }}>{Math.round(volume * 100)}%</span>
          </div>
          <div className="flex items-center gap-3">
            <Icon name="VolumeX" size={14} className="text-white/25" />
            <input type="range" min={0} max={1} step={0.01} value={volume} onChange={e => onVolumeChange(Number(e.target.value))} className="flex-1" />
            <Icon name="Volume2" size={14} className="text-white/25" />
          </div>
        </div>

        <div className="h-px bg-white/5" />

        {[
          ["Уведомления", "При смене трека или новостей"],
          ["Автовоспроизведение", "Продолжать при открытии сайта"],
        ].map(([title, sub]) => (
          <div key={title} className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80">{title}</p>
              <p className="text-xs text-white/30 mt-0.5">{sub}</p>
            </div>
            <div className="w-10 h-5.5 rounded-full relative flex-shrink-0 cursor-pointer" style={{ background: "hsl(262 83% 68%)", padding: "2px" }}>
              <span className="absolute right-0.5 top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow-sm" style={{ width: 18, height: 18 }} />
            </div>
          </div>
        ))}

        <div className="h-px bg-white/5" />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/80">Качество потока</p>
            <p className="text-xs text-white/30 mt-0.5">Влияет на потребление трафика</p>
          </div>
          <select className="bg-white/5 border border-white/8 rounded-xl px-3 py-1.5 text-xs text-white/70 focus:outline-none">
            <option style={{ background: "#0d0b14" }}>Высокое · 192kbps</option>
            <option style={{ background: "#0d0b14" }}>Среднее · 96kbps</option>
            <option style={{ background: "#0d0b14" }}>Низкое · 48kbps</option>
          </select>
        </div>
      </div>
    </div>
  </div>
);

// ─── Agreement Modal ──────────────────────────────────────────────────────────
const AgreementModal = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />
    <div className="glass-strong relative rounded-2xl w-full max-w-lg p-6 animate-scale-in max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-oswald text-lg text-white uppercase tracking-wider">Пользовательское соглашение</h2>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all flex-shrink-0">
          <Icon name="X" size={16} />
        </button>
      </div>
      <div className="space-y-3.5 text-sm leading-relaxed">
        {[
          ["1. Общие положения", "Использование сервиса означает принятие данных условий."],
          ["2. Условия", "Сервис предоставляется «как есть». Мы не несём ответственности за прерывания потоков."],
          ["3. Авторские права", "Мы не транслируем и не записываем контент. Все потоки публично доступны."],
          ["4. Добавление станций", "Пользователи могут добавлять публичные потоки. Незаконный контент удаляется."],
          ["5. Персональные данные", "Данные не собираются. Избранное хранится только локально в браузере."],
        ].map(([title, text]) => (
          <p key={title} className="text-white/45"><strong className="text-white/75">{title}.</strong> {text}</p>
        ))}
        <p className="text-white/20 text-xs pt-1">Редакция от 22 марта 2026 г.</p>
      </div>
      <button onClick={onClose} className="w-full mt-4 py-2.5 text-xs text-white/30 hover:text-white/50 border border-white/6 rounded-xl hover:bg-white/5 transition-all">
        Понятно
      </button>
    </div>
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Index() {
  const [stations, setStations] = useState<Station[]>(() => {
    try { return JSON.parse(localStorage.getItem("radio_stations") || "") || DEFAULT_STATIONS; } catch { return DEFAULT_STATIONS; }
  });
  const [favorites, setFavorites] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem("radio_favorites") || "[]"); } catch { return []; }
  });
  const [history, setHistory] = useState<{ station: Station; time: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem("radio_history") || "[]"); } catch { return []; }
  });

  const [currentStation, setCurrentStation] = useState<Station | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isLoading, setIsLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState("Все");
  const [bannerIndex, setBannerIndex] = useState(0);

  const [showAdd, setShowAdd] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { localStorage.setItem("radio_stations", JSON.stringify(stations)); }, [stations]);
  useEffect(() => { localStorage.setItem("radio_favorites", JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem("radio_history", JSON.stringify(history)); }, [history]);
  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);
  useEffect(() => {
    const t = setInterval(() => setBannerIndex(i => (i + 1) % BANNERS.length), 5000);
    return () => clearInterval(t);
  }, []);

  const playStation = useCallback((station: Station) => {
    if (currentStation?.id === station.id) {
      if (isPlaying) { audioRef.current?.pause(); setIsPlaying(false); }
      else { audioRef.current?.play().catch(() => {}); setIsPlaying(true); }
      return;
    }
    audioRef.current?.pause();
    setIsLoading(true);
    setCurrentStation(station);
    resolveStreamUrl(station.stream).then(url => {
      const audio = new Audio(url);
      audio.volume = volume;
      audio.play().then(() => { setIsPlaying(true); setIsLoading(false); })
               .catch(() => { setIsPlaying(false); setIsLoading(false); });
      audioRef.current = audio;
    });
    const t = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    setHistory(p => [{ station, time: t }, ...p.slice(0, 49)]);
  }, [currentStation, isPlaying, volume]);

  const toggleFavorite = (id: number) => setFavorites(p => p.includes(id) ? p.filter(f => f !== id) : [...p, id]);
  const addStation = (s: Station) => setStations(p => [s, ...p]);

  const filteredStations = stations.filter(s => {
    const q = searchQuery.toLowerCase();
    return (s.name.toLowerCase().includes(q) || s.genre.toLowerCase().includes(q)) &&
      (activeGenre === "Все" || s.genre === activeGenre);
  });

  const favStations = stations.filter(s => favorites.includes(s.id));

  const cardProps = (station: Station) => ({
    station, isPlaying, isCurrentStation: currentStation?.id === station.id,
    onPlay: playStation, onFavorite: toggleFavorite, isFavorite: favorites.includes(station.id),
  });

  // ── Banner ──────────────────────────────────────────────────────────────────
  const banner = BANNERS[bannerIndex];
  const accentColor = `hsl(${banner.accent})`;

  // ── Tabs ────────────────────────────────────────────────────────────────────
  const tabs = [
    { id: "home", label: "Главная", icon: "Home" },
    { id: "catalog", label: "Каталог", icon: "Radio" },
    { id: "favorites", label: "Избранное", icon: "Heart" },
    { id: "history", label: "История", icon: "Clock" },
  ] as const;

  return (
    <div className="min-h-screen bg-mesh flex flex-col relative">

      {/* ── Header ── */}
      <header className="sticky top-0 z-30" style={{ background: "hsl(240 10% 4% / 0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid hsl(0 0% 100% / 0.06)" }}>
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(262 83% 65%), hsl(220 80% 60%))", boxShadow: "0 0 16px hsl(262 83% 68% / 0.4)" }}>
              <Icon name="Radio" size={15} className="text-white" />
            </div>
            <span className="font-oswald text-base uppercase tracking-widest text-white/90">РадиоРоссии</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSupport(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-80"
              style={{ background: "hsl(262 83% 68% / 0.12)", border: "1px solid hsl(262 83% 68% / 0.25)", color: "hsl(262 83% 75%)" }}
            >
              <Icon name="Heart" size={12} />
              Поддержать
            </button>
            <button onClick={() => setShowSupport(true)} className="sm:hidden p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all">
              <Icon name="Heart" size={16} />
            </button>
            <button onClick={() => setShowAdd(true)} className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all">
              <Icon name="Plus" size={16} />
            </button>
            <button onClick={() => setShowSettings(true)} className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all">
              <Icon name="Settings" size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-5" style={{ paddingBottom: currentStation ? "9rem" : "5.5rem" }}>

        {/* HOME */}
        {activeTab === "home" && (
          <div className="space-y-6 animate-fade-in">
            {/* Banner */}
            <div className="relative overflow-hidden rounded-2xl" style={{ background: `linear-gradient(135deg, ${banner.from}, ${banner.via})`, border: "1px solid hsl(0 0% 100% / 0.06)" }}>
              <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 70% 80% at 90% 50%, hsl(${banner.accent} / 0.12), transparent)` }} />
              <div className="relative p-6 sm:p-8">
                <p className="text-xs uppercase tracking-widest mb-2 font-medium" style={{ color: accentColor }}>📻 Прямой эфир</p>
                <h1 className="font-oswald text-2xl sm:text-3xl text-white uppercase leading-tight whitespace-pre-line">{banner.title}</h1>
                <p className="text-sm mt-2" style={{ color: "hsl(0 0% 55%)" }}>{banner.sub}</p>

                <div className="flex items-center justify-between mt-5">
                  <div className="flex gap-1.5">
                    {BANNERS.map((_, i) => (
                      <button key={i} className="slider-dot rounded-full h-1" onClick={() => setBannerIndex(i)}
                        style={{ width: i === bannerIndex ? 24 : 12, background: i === bannerIndex ? accentColor : "hsl(0 0% 100% / 0.2)" }} />
                    ))}
                  </div>
                  <button
                    onClick={() => setActiveTab("catalog")}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-80"
                    style={{ background: `hsl(${banner.accent} / 0.15)`, color: accentColor, border: `1px solid hsl(${banner.accent} / 0.3)` }}
                  >
                    Все станции →
                  </button>
                </div>
              </div>
            </div>

            {/* Popular */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-oswald text-base uppercase tracking-wider text-white/80">🔥 Популярные</h2>
                <button onClick={() => setActiveTab("catalog")} className="text-xs text-white/30 hover:text-white/60 transition-colors">Все →</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {stations.slice(0, 6).map(s => <StationCard key={s.id} {...cardProps(s)} />)}
              </div>
            </div>

            {/* User added */}
            {stations.some(s => s.id > 1000) && (
              <div>
                <h2 className="font-oswald text-base uppercase tracking-wider text-white/80 mb-3">✨ Добавленные вами</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {stations.filter(s => s.id > 1000).slice(0, 4).map(s => <StationCard key={s.id} {...cardProps(s)} />)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CATALOG */}
        {activeTab === "catalog" && (
          <div className="space-y-4 animate-fade-in">
            {/* Search */}
            <div className="relative">
              <Icon name="Search" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "hsl(240 5% 40%)" }} />
              <input
                className="w-full rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder:text-white/25 transition-all"
                style={{ background: "hsl(0 0% 100% / 0.05)", border: "1px solid hsl(0 0% 100% / 0.07)" }}
                placeholder="Поиск по названию или жанру..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors" onClick={() => setSearchQuery("")}>
                  <Icon name="X" size={14} />
                </button>
              )}
            </div>

            {/* Genres */}
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {GENRES.map(genre => (
                <button key={genre} onClick={() => setActiveGenre(genre)}
                  className={`genre-pill flex-shrink-0 px-3.5 py-1.5 text-xs font-medium ${activeGenre === genre ? "active" : "text-white/40"}`}
                  style={{ background: activeGenre === genre ? undefined : "hsl(0 0% 100% / 0.04)" }}>
                  {genre}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: "hsl(240 5% 40%)" }}>
                Найдено: <span className="text-white font-medium">{filteredStations.length}</span>
              </p>
              <button onClick={() => setShowAdd(true)} className="text-xs hover:opacity-80 transition-opacity" style={{ color: "hsl(262 83% 72%)" }}>+ Добавить свою</button>
            </div>

            {filteredStations.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredStations.map(s => <StationCard key={s.id} {...cardProps(s)} />)}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-3xl mb-3">🔍</p>
                <p className="text-sm text-white/50">Ничего не найдено</p>
                <p className="text-xs text-white/25 mt-1">Попробуйте изменить запрос</p>
              </div>
            )}
          </div>
        )}

        {/* FAVORITES */}
        {activeTab === "favorites" && (
          <div className="animate-fade-in">
            {favStations.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {favStations.map(s => <StationCard key={s.id} {...cardProps(s)} />)}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-4xl mb-3">💜</p>
                <p className="text-sm text-white/50">Избранных пока нет</p>
                <p className="text-xs text-white/25 mt-1">Нажми ❤️ на карточке, чтобы добавить</p>
                <button onClick={() => setActiveTab("catalog")} className="mt-4 text-xs hover:opacity-80" style={{ color: "hsl(262 83% 72%)" }}>Перейти в каталог →</button>
              </div>
            )}
          </div>
        )}

        {/* HISTORY */}
        {activeTab === "history" && (
          <div className="animate-fade-in">
            {history.length > 0 ? (
              <div className="space-y-1">
                {history.map((entry, i) => (
                  <div key={i} onClick={() => playStation(entry.station)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-white/4 transition-all group">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: `${entry.station.color}15` }}>
                      {entry.station.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 font-medium truncate">{entry.station.name}</p>
                      <p className="text-xs text-white/30">{entry.station.genre} · {entry.time}</p>
                    </div>
                    <Icon name="Play" size={13} className="text-white/15 group-hover:text-white/40 transition-colors" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-4xl mb-3">🕐</p>
                <p className="text-sm text-white/50">История пуста</p>
                <p className="text-xs text-white/25 mt-1">Начни слушать — здесь появится история</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <div className="hidden sm:block text-center py-3 text-xs" style={{ color: "hsl(240 5% 30%)", marginBottom: currentStation ? "8.5rem" : "4.5rem" }}>
        © 2026 РадиоРоссии ·{" "}
        <button onClick={() => setShowAgreement(true)} className="hover:text-white/40 transition-colors underline underline-offset-2">Пользовательское соглашение</button>
      </div>

      {/* ── Bottom bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 glass-strong" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>

        {/* Player */}
        {currentStation && (
          <div className="px-4 py-3 border-b" style={{ borderColor: "hsl(0 0% 100% / 0.06)" }}>
            <div className="max-w-4xl mx-auto flex items-center gap-3">
              {/* Emoji */}
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 relative"
                style={{ background: `${currentStation.color}18`, boxShadow: isPlaying ? `0 0 14px ${currentStation.color}40` : "none" }}>
                {currentStation.emoji}
                {isPlaying && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ background: currentStation.color, boxShadow: `0 0 6px ${currentStation.color}` }} />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate leading-tight">{currentStation.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {isLoading
                    ? <span className="text-xs text-white/30">Подключение...</span>
                    : isPlaying
                    ? <WaveAnimation color={currentStation.color} />
                    : <span className="text-xs text-white/30">Пауза</span>
                  }
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1.5">
                <button onClick={() => toggleFavorite(currentStation.id)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/5 transition-all">
                  <Icon name="Heart" size={14} className={favorites.includes(currentStation.id) ? "fill-[hsl(262_83%_68%)] text-[hsl(262_83%_68%)]" : "text-white/25"} />
                </button>
                <button
                  onClick={() => playStation(currentStation)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 ${isPlaying ? "btn-play-glow" : ""}`}
                  style={{ background: "linear-gradient(135deg, hsl(262 83% 62%), hsl(220 80% 58%))" }}
                >
                  <Icon name={isPlaying ? "Pause" : "Play"} size={15} className="text-white" />
                </button>
                <button
                  onClick={() => { audioRef.current?.pause(); audioRef.current = null; setIsPlaying(false); setCurrentStation(null); }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/5 transition-all text-white/25 hover:text-white/50">
                  <Icon name="X" size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <div className="max-w-4xl mx-auto px-2 flex">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="relative flex-1 flex flex-col items-center gap-1 py-2.5 transition-all"
              style={{ color: activeTab === tab.id ? "hsl(262 83% 72%)" : "hsl(240 5% 40%)" }}>
              <Icon name={tab.icon} size={17} />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {tab.id === "favorites" && favorites.length > 0 && (
                <span className="absolute top-1.5 right-[calc(50%-14px)] min-w-[14px] h-3.5 px-0.5 rounded-full text-[8px] text-white flex items-center justify-center font-bold"
                  style={{ background: "hsl(262 83% 65%)" }}>
                  {favorites.length > 9 ? "9+" : favorites.length}
                </span>
              )}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full" style={{ background: "hsl(262 83% 68%)" }} />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Modals ── */}
      {showAdd      && <AddStationModal onClose={() => setShowAdd(false)} onAdd={addStation} />}
      {showSupport  && <SupportModal onClose={() => setShowSupport(false)} />}
      {showSettings && <SettingsPanel volume={volume} onVolumeChange={setVolume} onClose={() => setShowSettings(false)} />}
      {showAgreement && <AgreementModal onClose={() => setShowAgreement(false)} />}
    </div>
  );
}
