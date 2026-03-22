import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

// ─── Data ───────────────────────────────────────────────────────────────────

const GENRES = ["Все", "Поп", "Рок", "Джаз", "Классика", "Новости", "Разговорное", "Электронная", "Ретро", "Народная"];

const DEFAULT_STATIONS = [
  { id: 1, name: "Европа Плюс", genre: "Поп", freq: "106.2 FM", city: "Москва", stream: "https://ep256.hostingradio.ru/europaplus256.mp3", emoji: "🎵", color: "#E91E63" },
  { id: 2, name: "Русское Радио", genre: "Поп", freq: "105.7 FM", city: "Москва", stream: "https://rusradio.hostingradio.ru/rusradio96.aacp", emoji: "🎤", color: "#FF5722" },
  { id: 3, name: "Авторадио", genre: "Ретро", freq: "90.1 FM", city: "Москва", stream: "https://autoradio.hostingradio.ru/autoradio96.aacp", emoji: "🚗", color: "#FF9800" },
  { id: 4, name: "Радио Маяк", genre: "Разговорное", freq: "103.4 FM", city: "Москва", stream: "https://icecast.vgtrk.cdnvideo.ru/mayk_mp3_192kbps", emoji: "📡", color: "#2196F3" },
  { id: 5, name: "Радио Рекорд", genre: "Электронная", freq: "89.0 FM", city: "СПб", stream: "https://radiorecord.hostingradio.ru/rr96.aacp", emoji: "🎧", color: "#9C27B0" },
  { id: 6, name: "DFM", genre: "Электронная", freq: "101.2 FM", city: "Москва", stream: "https://dfm.hostingradio.ru/dfm96.aacp", emoji: "⚡", color: "#00BCD4" },
  { id: 7, name: "Дорожное Радио", genre: "Поп", freq: "96.0 FM", city: "Москва", stream: "https://dorognoe.hostingradio.ru/dorognoe96.aacp", emoji: "🛣️", color: "#4CAF50" },
  { id: 8, name: "Радио Jazz", genre: "Джаз", freq: "89.1 FM", city: "Москва", stream: "https://radiojazz.hostingradio.ru/radiojazz96.aacp", emoji: "🎷", color: "#795548" },
  { id: 9, name: "Наше Радио", genre: "Рок", freq: "101.7 FM", city: "Москва", stream: "https://nashe.hostingradio.ru/nashe-320.mp3", emoji: "🎸", color: "#F44336" },
  { id: 10, name: "Ретро FM", genre: "Ретро", freq: "88.0 FM", city: "Москва", stream: "https://retro.hostingradio.ru/retro256.mp3", emoji: "📻", color: "#FF6F00" },
  { id: 11, name: "Радио России", genre: "Разговорное", freq: "66.44 FM", city: "Вся Россия", stream: "https://icecast.vgtrk.cdnvideo.ru/otr_mp3_192kbps", emoji: "🇷🇺", color: "#1565C0" },
  { id: 12, name: "Energy", genre: "Электронная", freq: "104.2 FM", city: "Москва", stream: "https://energy.hostingradio.ru/energy96.aacp", emoji: "💥", color: "#E040FB" },
  { id: 13, name: "Rock FM", genre: "Рок", freq: "95.2 FM", city: "Москва", stream: "https://rockfm.hostingradio.ru/rockfm96.aacp", emoji: "🤘", color: "#D32F2F" },
  { id: 14, name: "Вести FM", genre: "Новости", freq: "97.6 FM", city: "Москва", stream: "https://icecast.vgtrk.cdnvideo.ru/vestifm_mp3_192kbps", emoji: "📰", color: "#37474F" },
  { id: 15, name: "Радио Маяк", genre: "Народная", freq: "103.4 FM", city: "Россия", stream: "https://icecast.vgtrk.cdnvideo.ru/mayk_mp3_192kbps", emoji: "🎻", color: "#8BC34A" },
  { id: 16, name: "Авторадио", genre: "Поп", freq: "90.3 FM", city: "СПб", stream: "https://autoradio.hostingradio.ru/autoradio96.aacp", emoji: "🚗", color: "#FF9800" },
];

const BANNERS = [
  { id: 1, title: "Слушай лучшие\nрадиостанции России", sub: "Более 200 станций в прямом эфире", accent: "#FF6B35", bg: "from-[#1a0f05] via-[#2d1a0a] to-[#0d0d14]" },
  { id: 2, title: "Добавь свою\nлюбимую станцию", sub: "Поделись находкой с другими слушателями", accent: "#7C3AED", bg: "from-[#0a0514] via-[#1a0a2e] to-[#0d0d14]" },
  { id: 3, title: "Слушай в любом\nместе и на ходу", sub: "Полная адаптация под мобильные устройства", accent: "#059669", bg: "from-[#041510] via-[#0a2218] to-[#0d0d14]" },
];

type Station = typeof DEFAULT_STATIONS[0];

// ─── M3U Parser ──────────────────────────────────────────────────────────────
async function resolveStreamUrl(url: string): Promise<string> {
  const isPlaylist = /\.(m3u8?|pls)(\?|$)/i.test(url);
  if (!isPlaylist) return url;

  try {
    const res = await fetch(url, { headers: { "Accept": "*/*" } });
    const text = await res.text();

    if (url.match(/\.pls/i)) {
      const match = text.match(/^File\d+=(.+)$/m);
      return match ? match[1].trim() : url;
    }

    // m3u / m3u8
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith("#"));
    if (lines.length > 0) {
      const first = lines[0];
      // relative URL → absolute
      if (first.startsWith("http")) return first;
      const base = new URL(url);
      return new URL(first, base).toString();
    }
  } catch {
    // fallback — try to play original url directly
  }
  return url;
}

// ─── Wave Animation ──────────────────────────────────────────────────────────
const WaveAnimation = () => (
  <div className="flex items-end gap-[2px] h-4">
    {[1, 2, 3, 4, 5].map(i => (
      <span key={i} className="wave-bar" style={{ height: `${6 + i * 3}px` }} />
    ))}
  </div>
);

// ─── Station Card ────────────────────────────────────────────────────────────
const StationCard = ({
  station, isPlaying, isCurrentStation, onPlay, onFavorite, isFavorite
}: {
  station: Station;
  isPlaying: boolean;
  isCurrentStation: boolean;
  onPlay: (s: Station) => void;
  onFavorite: (id: number) => void;
  isFavorite: boolean;
}) => (
  <div
    className={`station-card relative bg-card border rounded-xl p-4 cursor-pointer group ${isCurrentStation ? "border-primary/60 bg-primary/5" : "border-border"}`}
    onClick={() => onPlay(station)}
  >
    <div className="flex items-start gap-3">
      <div
        className="relative w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 select-none"
        style={{ background: `${station.color}22`, border: `1px solid ${station.color}44` }}
      >
        {station.emoji}
        {isCurrentStation && isPlaying && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
            <span className="w-1.5 h-1.5 bg-white rounded-full" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className={`font-semibold text-sm truncate ${isCurrentStation ? "text-primary" : "text-foreground"}`}>
            {station.name}
          </h3>
          {isCurrentStation && isPlaying && <WaveAnimation />}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{station.genre} · {station.freq}</p>
        <p className="text-xs text-muted-foreground/60 mt-0.5">{station.city}</p>
      </div>
      <button
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-secondary"
        onClick={e => { e.stopPropagation(); onFavorite(station.id); }}
      >
        <Icon
          name="Heart"
          size={14}
          className={isFavorite ? "fill-primary text-primary" : "text-muted-foreground"}
        />
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
    onAdd({
      id: Date.now(),
      name: form.name,
      genre: form.genre,
      freq: form.freq || "Online",
      city: form.city || "Онлайн",
      stream: form.stream,
      emoji: form.emoji,
      color: "#FF6B35",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-oswald text-xl text-foreground uppercase tracking-wide">Добавить станцию</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary">
            <Icon name="X" size={18} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-wide">Название *</label>
            <input
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
              placeholder="Моя любимая радиостанция"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-wide">Ссылка на поток * (mp3/aac/m3u/pls)</label>
            <input
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
              placeholder="https://stream.example.com/live.mp3 или .m3u"
              value={form.stream}
              onChange={e => setForm(p => ({ ...p, stream: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-wide">Жанр</label>
              <select
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
                value={form.genre}
                onChange={e => setForm(p => ({ ...p, genre: e.target.value }))}
              >
                {GENRES.filter(g => g !== "Все").map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-wide">Частота</label>
              <input
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="101.5 FM"
                value={form.freq}
                onChange={e => setForm(p => ({ ...p, freq: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-wide">Город</label>
            <input
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
              placeholder="Москва"
              value={form.city}
              onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block uppercase tracking-wide">Иконка</label>
            <div className="flex flex-wrap gap-2">
              {emojis.map(e => (
                <button
                  key={e}
                  className={`w-9 h-9 rounded-lg text-lg transition-all ${form.emoji === e ? "bg-primary/20 border border-primary" : "bg-secondary hover:bg-secondary/80"}`}
                  onClick={() => setForm(p => ({ ...p, emoji: e }))}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          className="w-full mt-6 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm hover:bg-primary/90 transition-colors"
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
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
    <div
      className="relative bg-card border border-border rounded-2xl w-full max-w-sm p-6 mx-4 animate-scale-in"
      onClick={e => e.stopPropagation()}
    >
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">❤️</div>
        <h2 className="font-oswald text-2xl text-foreground uppercase tracking-wide">Поддержать проект</h2>
        <p className="text-muted-foreground text-sm mt-2">Помогите нам развивать сервис</p>
      </div>
      <div className="space-y-3 mb-6">
        {[["100 ₽", "Чашка кофе"], ["500 ₽", "Поддержка разработки"], ["1000 ₽", "Серьёзный вклад"]].map(([amount, label]) => (
          <button key={amount} className="w-full flex items-center justify-between bg-secondary hover:bg-secondary/80 rounded-xl px-4 py-3 transition-colors group">
            <span className="text-foreground font-semibold">{amount}</span>
            <span className="text-muted-foreground text-sm">{label}</span>
            <Icon name="ArrowRight" size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
        ))}
      </div>
      <button onClick={onClose} className="w-full border border-border text-muted-foreground rounded-xl py-2.5 text-sm hover:bg-secondary transition-colors">
        Закрыть
      </button>
    </div>
  </div>
);

// ─── Settings Panel ───────────────────────────────────────────────────────────
const SettingsPanel = ({ volume, onVolumeChange, onClose }: {
  volume: number;
  onVolumeChange: (v: number) => void;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
    <div
      className="relative bg-card border border-border rounded-t-2xl w-full max-w-lg p-6 animate-fade-in"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-oswald text-xl uppercase tracking-wide">Настройки</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary">
          <Icon name="X" size={18} />
        </button>
      </div>
      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium">Громкость</label>
            <span className="text-sm text-primary font-semibold">{Math.round(volume * 100)}%</span>
          </div>
          <div className="flex items-center gap-3">
            <Icon name="VolumeX" size={16} className="text-muted-foreground" />
            <input
              type="range" min={0} max={1} step={0.01} value={volume}
              onChange={e => onVolumeChange(Number(e.target.value))}
              className="flex-1"
            />
            <Icon name="Volume2" size={16} className="text-muted-foreground" />
          </div>
        </div>
        <div className="flex items-center justify-between py-3 border-t border-border">
          <div>
            <p className="text-sm font-medium">Уведомления</p>
            <p className="text-xs text-muted-foreground mt-0.5">При смене треков и новостей</p>
          </div>
          <button className="w-11 h-6 bg-primary rounded-full relative flex-shrink-0">
            <span className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow" />
          </button>
        </div>
        <div className="flex items-center justify-between py-3 border-t border-border">
          <div>
            <p className="text-sm font-medium">Качество потока</p>
            <p className="text-xs text-muted-foreground mt-0.5">Высокое качество потребляет больше трафика</p>
          </div>
          <select className="bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary">
            <option>Высокое</option>
            <option>Среднее</option>
            <option>Низкое</option>
          </select>
        </div>
      </div>
    </div>
  </div>
);

// ─── Agreement Modal ──────────────────────────────────────────────────────────
const AgreementModal = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
    <div
      className="relative bg-card border border-border rounded-2xl w-full max-w-lg p-6 animate-scale-in max-h-[80vh] overflow-y-auto"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-oswald text-xl uppercase tracking-wide">Пользовательское соглашение</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary flex-shrink-0">
          <Icon name="X" size={18} />
        </button>
      </div>
      <div className="text-sm text-muted-foreground space-y-4 leading-relaxed">
        <p><strong className="text-foreground">1. Общие положения.</strong> Настоящее соглашение регулирует использование сервиса онлайн-радио. Используя сайт, вы соглашаетесь с данными условиями.</p>
        <p><strong className="text-foreground">2. Условия использования.</strong> Сервис предоставляется «как есть». Мы не несём ответственности за прерывания в работе потоков радиостанций.</p>
        <p><strong className="text-foreground">3. Авторские права.</strong> Мы не транслируем и не записываем контент радиостанций. Все потоки являются публично доступными.</p>
        <p><strong className="text-foreground">4. Добавление станций.</strong> Пользователи могут добавлять публично доступные радиопотоки. Администрация вправе удалять контент, нарушающий законодательство РФ.</p>
        <p><strong className="text-foreground">5. Персональные данные.</strong> Сервис не собирает личных данных. Данные об избранных станциях хранятся только локально в браузере.</p>
        <p className="text-xs text-muted-foreground/60">Редакция от 22 марта 2026 г.</p>
      </div>
      <button onClick={onClose} className="w-full mt-4 bg-secondary text-foreground rounded-xl py-2.5 text-sm hover:bg-secondary/80 transition-colors">
        Понятно
      </button>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Index() {
  const [stations, setStations] = useState<Station[]>(() => {
    try {
      const saved = localStorage.getItem("radio_stations");
      return saved ? JSON.parse(saved) : DEFAULT_STATIONS;
    } catch { return DEFAULT_STATIONS; }
  });
  const [favorites, setFavorites] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem("radio_favorites");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [history, setHistory] = useState<{ station: Station; time: string }[]>(() => {
    try {
      const saved = localStorage.getItem("radio_history");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [currentStation, setCurrentStation] = useState<Station | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [activeTab, setActiveTab] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState("Все");
  const [bannerIndex, setBannerIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { localStorage.setItem("radio_stations", JSON.stringify(stations)); }, [stations]);
  useEffect(() => { localStorage.setItem("radio_favorites", JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem("radio_history", JSON.stringify(history)); }, [history]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    const t = setInterval(() => setBannerIndex(i => (i + 1) % BANNERS.length), 5000);
    return () => clearInterval(t);
  }, []);

  const playStation = useCallback((station: Station) => {
    if (currentStation?.id === station.id) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play().catch(() => {});
        setIsPlaying(true);
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }

    setIsLoading(true);
    setCurrentStation(station);

    resolveStreamUrl(station.stream).then(resolvedUrl => {
      const audio = new Audio(resolvedUrl);
      audio.volume = volume;
      audio.play().then(() => {
        setIsPlaying(true);
        setIsLoading(false);
      }).catch(() => {
        setIsPlaying(false);
        setIsLoading(false);
      });
      audioRef.current = audio;
    });

    const time = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    setHistory(prev => [{ station, time }, ...prev.slice(0, 49)]);
  }, [currentStation, isPlaying, volume]);

  const toggleFavorite = (id: number) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const addStation = (station: Station) => {
    setStations(prev => [station, ...prev]);
  };

  const filteredStations = stations.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.genre.toLowerCase().includes(searchQuery.toLowerCase());
    const matchGenre = activeGenre === "Все" || s.genre === activeGenre;
    return matchSearch && matchGenre;
  });

  const favoriteStations = stations.filter(s => favorites.includes(s.id));

  // ─── Renders ───────────────────────────────────────────────────────────────

  const renderHome = () => (
    <div className="space-y-6 animate-fade-in">
      {/* Banner Slider */}
      <div className="relative overflow-hidden rounded-2xl">
        <div
          className={`relative bg-gradient-to-br ${BANNERS[bannerIndex].bg} p-6 sm:p-8 min-h-[180px] flex flex-col justify-between transition-all duration-700`}
          style={{ borderBottom: `3px solid ${BANNERS[bannerIndex].accent}` }}
        >
          <div
            className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ background: BANNERS[bannerIndex].accent }}
          />
          <div>
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: BANNERS[bannerIndex].accent }}>
              📻 Радио Онлайн
            </p>
            <h1 className="font-oswald text-2xl sm:text-3xl text-white uppercase leading-tight whitespace-pre-line">
              {BANNERS[bannerIndex].title}
            </h1>
            <p className="text-sm text-white/60 mt-2">{BANNERS[bannerIndex].sub}</p>
          </div>
          <div className="flex gap-1.5 mt-4">
            {BANNERS.map((_, i) => (
              <button
                key={i}
                className="slider-dot h-1 rounded-full transition-all"
                style={{
                  width: i === bannerIndex ? "2rem" : "1rem",
                  opacity: i === bannerIndex ? 1 : 0.4,
                  background: BANNERS[bannerIndex].accent,
                }}
                onClick={() => setBannerIndex(i)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Popular */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-oswald text-lg uppercase tracking-wide text-foreground">🔥 Популярные</h2>
          <button className="text-xs text-primary hover:underline" onClick={() => setActiveTab("catalog")}>Все →</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {stations.slice(0, 6).map(station => (
            <StationCard
              key={station.id}
              station={station}
              isPlaying={isPlaying}
              isCurrentStation={currentStation?.id === station.id}
              onPlay={playStation}
              onFavorite={toggleFavorite}
              isFavorite={favorites.includes(station.id)}
            />
          ))}
        </div>
      </div>

      {/* User-added */}
      {stations.some(s => s.id > 1000) && (
        <div>
          <h2 className="font-oswald text-lg uppercase tracking-wide text-foreground mb-3">✨ Добавленные вами</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {stations.filter(s => s.id > 1000).slice(0, 4).map(station => (
              <StationCard
                key={station.id}
                station={station}
                isPlaying={isPlaying}
                isCurrentStation={currentStation?.id === station.id}
                onPlay={playStation}
                onFavorite={toggleFavorite}
                isFavorite={favorites.includes(station.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderCatalog = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="relative">
        <Icon name="Search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          placeholder="Поиск по названию или жанру..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearchQuery("")}>
            <Icon name="X" size={14} />
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {GENRES.map(genre => (
          <button
            key={genre}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${activeGenre === genre ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
            onClick={() => setActiveGenre(genre)}
          >
            {genre}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Найдено: <span className="text-foreground font-semibold">{filteredStations.length}</span> станций</p>
        <button className="text-xs text-primary hover:underline" onClick={() => setShowAddModal(true)}>+ Добавить свою</button>
      </div>

      {filteredStations.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filteredStations.map(station => (
            <StationCard
              key={station.id}
              station={station}
              isPlaying={isPlaying}
              isCurrentStation={currentStation?.id === station.id}
              onPlay={playStation}
              onFavorite={toggleFavorite}
              isFavorite={favorites.includes(station.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-medium">Ничего не найдено</p>
          <p className="text-sm mt-1">Попробуйте изменить запрос или жанр</p>
        </div>
      )}
    </div>
  );

  const renderFavorites = () => (
    <div className="animate-fade-in">
      {favoriteStations.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {favoriteStations.map(station => (
            <StationCard
              key={station.id}
              station={station}
              isPlaying={isPlaying}
              isCurrentStation={currentStation?.id === station.id}
              onPlay={playStation}
              onFavorite={toggleFavorite}
              isFavorite={true}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <div className="text-5xl mb-4">💔</div>
          <p className="font-medium text-foreground">Избранных пока нет</p>
          <p className="text-sm mt-2">Нажми ❤️ на карточке станции, чтобы добавить</p>
          <button className="mt-4 text-primary text-sm hover:underline" onClick={() => setActiveTab("catalog")}>Перейти в каталог →</button>
        </div>
      )}
    </div>
  );

  const renderHistory = () => (
    <div className="animate-fade-in">
      {history.length > 0 ? (
        <div className="space-y-1">
          {history.map((entry, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 cursor-pointer transition-colors group"
              onClick={() => playStation(entry.station)}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: `${entry.station.color}22` }}
              >
                {entry.station.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{entry.station.name}</p>
                <p className="text-xs text-muted-foreground">{entry.station.genre} · {entry.time}</p>
              </div>
              <Icon name="Play" size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <div className="text-5xl mb-4">🕐</div>
          <p className="font-medium text-foreground">История пуста</p>
          <p className="text-sm mt-2">Начни слушать радио — здесь появится история</p>
        </div>
      )}
    </div>
  );

  const tabs = [
    { id: "home", label: "Главная", icon: "Home" },
    { id: "catalog", label: "Каталог", icon: "Radio" },
    { id: "favorites", label: "Избранное", icon: "Heart" },
    { id: "history", label: "История", icon: "Clock" },
  ] as const;

  return (
    <div className="min-h-screen bg-mesh flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Icon name="Radio" size={14} className="text-primary-foreground" />
            </div>
            <span className="font-oswald text-lg uppercase tracking-wider text-foreground">РадиоРоссии</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors flex items-center gap-1.5"
              onClick={() => setShowSupportModal(true)}
            >
              <Icon name="Heart" size={12} />
              <span className="hidden sm:inline">Поддержать</span>
            </button>
            <button className="p-2 rounded-lg hover:bg-secondary transition-colors" onClick={() => setShowAddModal(true)}>
              <Icon name="Plus" size={16} className="text-muted-foreground" />
            </button>
            <button className="p-2 rounded-lg hover:bg-secondary transition-colors" onClick={() => setShowSettings(true)}>
              <Icon name="Settings" size={16} className="text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main
        className="flex-1 max-w-4xl mx-auto w-full px-4 py-5"
        style={{ paddingBottom: currentStation ? "9rem" : "5rem" }}
      >
        {activeTab === "home" && renderHome()}
        {activeTab === "catalog" && renderCatalog()}
        {activeTab === "favorites" && renderFavorites()}
        {activeTab === "history" && renderHistory()}
      </main>

      {/* Footer (desktop) */}
      <div
        className="hidden sm:block text-center py-3 text-xs text-muted-foreground/40 border-t border-border/20"
        style={{ marginBottom: currentStation ? "8.5rem" : "4rem" }}
      >
        © 2026 РадиоРоссии ·{" "}
        <button
          className="hover:text-muted-foreground transition-colors underline-offset-2 hover:underline"
          onClick={() => setShowAgreement(true)}
        >
          Пользовательское соглашение
        </button>
        {" "}· Все права защищены
      </div>

      {/* Bottom Nav + Player */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-xl border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Player bar */}
        {currentStation && (
          <div className="border-b border-border px-4 py-2.5">
            <div className="max-w-4xl mx-auto flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 relative"
                style={{ background: `${currentStation.color}22` }}
              >
                {currentStation.emoji}
                {isPlaying && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate leading-tight">{currentStation.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {isLoading
                    ? <span className="text-xs text-muted-foreground">Подключение...</span>
                    : isPlaying
                    ? <WaveAnimation />
                    : <span className="text-xs text-muted-foreground">Пауза</span>
                  }
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  className="w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-all"
                  onClick={() => toggleFavorite(currentStation.id)}
                >
                  <Icon
                    name="Heart"
                    size={13}
                    className={favorites.includes(currentStation.id) ? "fill-primary text-primary" : "text-muted-foreground"}
                  />
                </button>
                <button
                  className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-all active:scale-95"
                  onClick={() => playStation(currentStation)}
                >
                  <Icon name={isPlaying ? "Pause" : "Play"} size={15} className="text-primary-foreground" />
                </button>
                <button
                  className="w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-all"
                  onClick={() => {
                    audioRef.current?.pause();
                    audioRef.current = null;
                    setIsPlaying(false);
                    setCurrentStation(null);
                  }}
                >
                  <Icon name="X" size={13} className="text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Nav tabs */}
        <div className="max-w-4xl mx-auto px-2 flex items-center">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`relative flex-1 flex flex-col items-center gap-1 py-2 transition-all ${activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon name={tab.icon} size={18} />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {tab.id === "favorites" && favorites.length > 0 && (
                <span className="absolute top-1 right-[calc(50%-14px)] w-3.5 h-3.5 bg-primary rounded-full text-[8px] text-primary-foreground flex items-center justify-center font-bold">
                  {favorites.length > 9 ? "9+" : favorites.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Modals */}
      {showAddModal && <AddStationModal onClose={() => setShowAddModal(false)} onAdd={addStation} />}
      {showSupportModal && <SupportModal onClose={() => setShowSupportModal(false)} />}
      {showSettings && <SettingsPanel volume={volume} onVolumeChange={setVolume} onClose={() => setShowSettings(false)} />}
      {showAgreement && <AgreementModal onClose={() => setShowAgreement(false)} />}
    </div>
  );
}