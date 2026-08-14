export type Lang = "tc" | "en";

const tc = {
  "app.title": "HK 隨機路線",
  "app.tagline": "隨機行人路路線生成器",

  "origin.title": "起點",
  "origin.currentLocation": "使用當前位置",
  "origin.pinHint": "在地圖上點一下，設定起點",
  "origin.bookmark": "儲存起點",
  "origin.bookmarked": "已儲存起點",
  "origin.chooseBookmark": "已儲存起點",

  "distance.label": "距離",
  "distance.unit": "公里",
  "distance.presets": "常用距離",
  "distance.error.number": "請輸入有效數字",
  "distance.error.range": "距離須介乎 0.5 至 50 公里",

  "criteria.title": "條件",
  "criteria.covered": "優先有蓋",
  "criteria.barrierFree": "只限無障礙",
  "criteria.flat": "只限平坦",
  "criteria.loop": "環形路線",

  "action.generate": "生成路線",
  "action.regenerate": "重新生成",
  "action.loading": "生成中…",

  "origin.snapped": "起點已設定（吸附偏差 {m} 米）",

  "route.distance": "距離",
  "route.duration.walk": "步行時間",
  "route.duration.run": "跑步時間",
  "route.gain": "爬升",
  "route.factor.covered": "有蓋",
  "route.factor.barrierFree": "無障礙",
  "route.badge.loop": "環形",
  "route.badge.oneway": "單程",
  "route.badge.outAndBack": "來回",
  "route.streets": "途經街道",
  "route.save": "儲存路線",
  "route.saved": "已儲存",
  "route.savedToast": "路線已儲存",
  "route.exportGpx": "匯出 GPX",
  "route.share": "分享連結",
  "route.shareCopied": "連結已複製",
  "route.deviation": "目標 {target} · 偏離 {pct}",

  "error.noCompliantSegment": "起點附近（500 米內）沒有符合條件的路段",
  "error.unsupportedDistance": "距離超出支援範圍（0.5–50 公里）",
  "error.noRoute": "未能生成路線，請嘗試調整條件",
  "error.generic": "發生錯誤，請重試",
  "error.locationDenied": "無法使用定位 — 請在瀏覽器／系統設定中允許取用位置",

  "weather.title": "天氣警告",
  "weather.none": "目前沒有生效的天氣警告",
  "weather.loading": "正在檢查天氣…",
  "weather.source": "資料由香港天文台提供",

  "history.title": "路線紀錄",
  "history.empty": "尚未儲存任何路線",
  "history.open": "開啟",
  "history.delete": "刪除",

  "follow.start": "開始跟進",
  "follow.stop": "停止跟進",
  "follow.onRoute": "在路線上",
  "follow.offRoute": "偏離路線（{m} 米）",
  "follow.currentStreet": "當前街道：{name}",
  "follow.nextSegment": "下一段",
  "follow.remaining": "剩餘 {d}",
  "follow.lost": "無法取得定位",
  "follow.lostDetail": "GPS 訊號中斷，請確認位置服務已開啟",
  "follow.retry": "重試",
  "origin.place": "設為起點",
  "origin.cancel": "取消",
  "criteria.soft": "偏好",

  "dock.saved": "收藏",
  "dock.about": "關於",
  "dock.collapse": "收合控制面板",
  "dock.expand": "展開控制面板",
  "nav.controls": "控制面板",
  "nav.weather": "天氣",
  "nav.favourites": "收藏",
  "nav.about": "關於此應用",
  "nav.themeLight": "切換至淺色主題",
  "nav.themeDark": "切換至深色主題",
  "nav.langToTc": "切換至繁體中文",
  "nav.langToEn": "切換至英文",
  "nav.controlsShort": "設定",
  "nav.legendShort": "圖例",
  "nav.langShort": "語言",
  "nav.themeShort": "主題",
  "nav.favouritesShort": "收藏",
  "nav.weatherShort": "天氣",
  "nav.aboutShort": "關於",
  "toast.undo": "復原",
  "toast.bookmarkDeleted": "起點已刪除",
  "toast.historyDeleted": "路線已刪除",
  "panel.criteria": "條件",
  "panel.route": "路線",
  "route.via": "途經",
  "route.empty": "尚未生成路線 · 設定距離並點擊生成",
  "saved.title": "收藏",
  "saved.close": "關閉",
  "saved.rename": "改名",
  "saved.renamePlaceholder": "輸入名稱",
  "about.title": "關於此應用",  "about.howTo": "如何使用？",  "about.intro":
    "在地圖上選擇起點，輸入距離並設定條件，即可隨機生成一條適合跑步或步行的路線。",
  "about.created.prefix": "由 ",
  "about.created.author": "Justin Tse",
  "about.created.suffix":
    " 創作，HK 隨機路線鼓勵跑手、緩步跑者與城市漫遊者跳出日常習慣，發掘香港在慣常路徑以外隱藏的美。",
  "about.data.body": "路線網絡資料由地政總署提供（香港 3D 行人網絡）。",
  "about.features.title": "儲存與匯出",
  "about.features.bookmark":
    "可將常用起點存入收藏，並將生成的路線儲存至路線紀錄，隨時一鍵重新開啟。",
  "about.features.gpx":
    "可將路線匯出為 GPX 檔案，匯入 Strava、Garmin 等運動應用程式使用。",
  "about.close": "關閉",

  "legend.title": "圖例",
  "legend.toggle": "地圖圖例",
  "legend.route": "路線",
  "legend.covered": "有蓋路段",
  "legend.steep": "陡峭路段",
  "legend.origin": "起點",
  "legend.position": "目前位置",

  "format.km": "公里",
  "format.m": "米",
  "format.min": "分鐘",
  "format.hour": "小時",
} as const;

const en: Record<keyof typeof tc, string> = {
  "app.title": "HK Random Route",
  "app.tagline": "Random walkway route generator",

  "origin.title": "Origin",
  "origin.currentLocation": "Use my location",
  "origin.pinHint": "Tap the map to set your origin",
  "origin.bookmark": "Bookmark origin",
  "origin.bookmarked": "Origin saved",
  "origin.chooseBookmark": "Saved origins",

  "distance.label": "Distance",
  "distance.unit": "km",
  "distance.presets": "Quick distance",
  "distance.error.number": "Enter a valid number",
  "distance.error.range": "Distance must be between 0.5 and 50 km",

  "criteria.title": "Criteria",
  "criteria.covered": "Prioritize covered",
  "criteria.barrierFree": "Barrier-free only",
  "criteria.flat": "Flat only",
  "criteria.loop": "Loop",

  "action.generate": "Generate route",
  "action.regenerate": "Regenerate",
  "action.loading": "Generating…",

  "origin.snapped": "Origin set · snapped {m} m from tap",

  "route.distance": "Distance",
  "route.duration.walk": "Walking time",
  "route.duration.run": "Running time",
  "route.gain": "Elevation gain",
  "route.factor.covered": "Covered",
  "route.factor.barrierFree": "Barrier-free",
  "route.badge.loop": "Loop",
  "route.badge.oneway": "One-way",
  "route.badge.outAndBack": "Out-and-back",
  "route.streets": "Streets",
  "route.save": "Save route",
  "route.saved": "Saved",
  "route.savedToast": "Route saved",
  "route.exportGpx": "Export GPX",
  "route.share": "Share link",
  "route.shareCopied": "Link copied",
  "route.deviation": "{pct} off the {target} target",

  "error.noCompliantSegment": "No compliant segment near your origin (within 500 m)",
  "error.unsupportedDistance": "Distance outside the supported range (0.5–50 km)",
  "error.noRoute": "Could not generate a route. Try adjusting your criteria.",
  "error.generic": "Something went wrong. Please try again.",
  "error.locationDenied":
    "Location unavailable — allow location access in your browser or system settings",

  "weather.title": "Weather warning",
  "weather.none": "No active weather warning",
  "weather.loading": "Checking weather…",
  "weather.source": "Information provided by Hong Kong Observatory",

  "history.title": "Route history",
  "history.empty": "No saved routes yet",
  "history.open": "Open",
  "history.delete": "Delete",

  "follow.start": "Start follow",
  "follow.stop": "Stop follow",
  "follow.onRoute": "On route",
  "follow.offRoute": "Off route ({m} m)",
  "follow.currentStreet": "Current street: {name}",
  "follow.nextSegment": "Next segment",
  "follow.remaining": "Remaining {d}",
  "follow.lost": "GPS signal lost",
  "follow.lostDetail": "Position signal interrupted — check location services",
  "follow.retry": "Retry",
  "origin.place": "Set as start",
  "origin.cancel": "Cancel",
  "criteria.soft": "Preference",

  "dock.saved": "Favourites",
  "dock.about": "About",
  "dock.collapse": "Collapse panel",
  "dock.expand": "Expand panel",
  "nav.controls": "Control panel",
  "nav.weather": "Weather",
  "nav.favourites": "Favourites",
  "nav.about": "About this app",
  "nav.themeLight": "Switch to light theme",
  "nav.themeDark": "Switch to dark theme",
  "nav.langToTc": "Switch to Traditional Chinese",
  "nav.langToEn": "Switch to English",
  "nav.controlsShort": "Controls",
  "nav.legendShort": "Legend",
  "nav.langShort": "Language",
  "nav.themeShort": "Theme",
  "nav.favouritesShort": "Saved",
  "nav.weatherShort": "Weather",
  "nav.aboutShort": "About",
  "toast.undo": "Undo",
  "toast.bookmarkDeleted": "Bookmark removed",
  "toast.historyDeleted": "Route removed",
  "panel.criteria": "Criteria",
  "panel.route": "Route",
  "route.via": "Via",
  "route.empty": "No route yet · pick a distance and generate",
  "saved.title": "Favourites",
  "saved.close": "Close",
  "saved.rename": "Rename",
  "saved.renamePlaceholder": "Enter a name",
  "about.title": "About this app",
  "about.howTo": "How to use?",
  "about.intro":
    "Tap the map to set your origin, choose a distance and criteria, and generate a random jogging or walking route.",
  "about.created.prefix": "Created by ",
  "about.created.author": "Justin Tse",
  "about.created.suffix":
    ", Hong Kong Random Route encourages runners, joggers, and city flâneurs to break out of their routines and discover the hidden beauty of Hong Kong off the beaten path.",
  "about.data.body":
    "Route network data provided by the Lands Department (HK 3D Pedestrian Network).",
  "about.features.title": "Saving & export",
  "about.features.bookmark":
    "Bookmark favourite starting points and save generated routes to your history, so you can reopen them anytime with a single tap.",
  "about.features.gpx":
    "Export the route as a GPX file and import it into sport apps such as Strava or Garmin.",
  "about.close": "Close",

  "legend.title": "Legend",
  "legend.toggle": "Map legend",
  "legend.route": "Route",
  "legend.covered": "Covered",
  "legend.steep": "Steep",
  "legend.origin": "Origin",
  "legend.position": "Current location",

  "format.km": "km",
  "format.m": "m",
  "format.min": "min",
  "format.hour": "h",
};

export type I18nKey = keyof typeof tc;

export const dict: Record<Lang, Record<I18nKey, string>> = { tc, en };

export function t(lang: Lang, key: I18nKey): string {
  return dict[lang][key];
}

export function fmt(
  lang: Lang,
  key: I18nKey,
  params: Record<string, string | number>,
): string {
  let s = t(lang, key);
  for (const [k, v] of Object.entries(params)) {
    s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}

export function formatDistance(lang: Lang, m: number): string {
  if (m >= 1000) {
    const km = m / 1000;
    const digits = km < 10 ? 2 : km < 100 ? 1 : 0;
    const clean = parseFloat(km.toFixed(digits)).toString();
    return `${clean} ${t(lang, "format.km")}`;
  }
  return `${Math.round(m)} ${t(lang, "format.m")}`;
}

export function formatDuration(lang: Lang, seconds: number): string {
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins} ${t(lang, "format.min")}`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0
    ? `${h} ${t(lang, "format.hour")}`
    : `${h} ${t(lang, "format.hour")} ${m} ${t(lang, "format.min")}`;
}
