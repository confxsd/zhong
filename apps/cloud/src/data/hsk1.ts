// HSK 1 curriculum data — kept in sync with apps/cloud/src/data/hsk1.ts.
// Aligned with the official HSK 1 word list (150 words) and the core
// grammar points taught in the first semester of Chinese language schools
// (HSK Standard Course 1 / 汉语教程 equivalents). Standard Mandarin,
// simplified characters, pinyin.

export interface TrackWord {
  hanzi: string;
  pinyin: string;
  meaning: string;
}

export interface TrackGrammar {
  slug: string;
  title: string;
  explanation: string;
  example: string;
  example_translation: string;
}

export const HSK1_TRACK = {
  slug: "hsk1",
  title: "HSK 1 Foundations",
  subtitle:
    "The 150 core words and grammar points that Chinese language schools teach first.",
  kind: "hsk",
};

export const HSK1_WORDS: TrackWord[] = [
  { hanzi: "爱", pinyin: "ài", meaning: "to love" },
  { hanzi: "八", pinyin: "bā", meaning: "eight" },
  { hanzi: "爸爸", pinyin: "bàba", meaning: "dad" },
  { hanzi: "杯子", pinyin: "bēizi", meaning: "cup; glass" },
  { hanzi: "北京", pinyin: "Běijīng", meaning: "Beijing" },
  { hanzi: "本", pinyin: "běn", meaning: "measure word for books" },
  { hanzi: "不", pinyin: "bù", meaning: "no; not" },
  { hanzi: "不客气", pinyin: "bù kèqi", meaning: "you're welcome" },
  { hanzi: "菜", pinyin: "cài", meaning: "dish; vegetable" },
  { hanzi: "茶", pinyin: "chá", meaning: "tea" },
  { hanzi: "吃", pinyin: "chī", meaning: "to eat" },
  { hanzi: "出租车", pinyin: "chūzūchē", meaning: "taxi" },
  { hanzi: "打电话", pinyin: "dǎ diànhuà", meaning: "to make a phone call" },
  { hanzi: "大", pinyin: "dà", meaning: "big" },
  { hanzi: "的", pinyin: "de", meaning: "possessive particle" },
  { hanzi: "点", pinyin: "diǎn", meaning: "o'clock; a little" },
  { hanzi: "电脑", pinyin: "diànnǎo", meaning: "computer" },
  { hanzi: "电视", pinyin: "diànshì", meaning: "television" },
  { hanzi: "电影", pinyin: "diànyǐng", meaning: "movie" },
  { hanzi: "东西", pinyin: "dōngxi", meaning: "thing" },
  { hanzi: "都", pinyin: "dōu", meaning: "all; both" },
  { hanzi: "读", pinyin: "dú", meaning: "to read" },
  { hanzi: "对不起", pinyin: "duìbuqǐ", meaning: "sorry" },
  { hanzi: "多", pinyin: "duō", meaning: "many; much" },
  { hanzi: "多少", pinyin: "duōshao", meaning: "how many; how much" },
  { hanzi: "儿子", pinyin: "érzi", meaning: "son" },
  { hanzi: "二", pinyin: "èr", meaning: "two" },
  { hanzi: "饭店", pinyin: "fàndiàn", meaning: "restaurant" },
  { hanzi: "飞机", pinyin: "fēijī", meaning: "airplane" },
  { hanzi: "分钟", pinyin: "fēnzhōng", meaning: "minute" },
  { hanzi: "高兴", pinyin: "gāoxìng", meaning: "happy" },
  { hanzi: "个", pinyin: "gè", meaning: "measure word (generic)" },
  { hanzi: "工作", pinyin: "gōngzuò", meaning: "work; job" },
  { hanzi: "狗", pinyin: "gǒu", meaning: "dog" },
  { hanzi: "汉语", pinyin: "Hànyǔ", meaning: "Chinese language" },
  { hanzi: "好", pinyin: "hǎo", meaning: "good" },
  { hanzi: "号", pinyin: "hào", meaning: "number; day of month" },
  { hanzi: "喝", pinyin: "hē", meaning: "to drink" },
  { hanzi: "和", pinyin: "hé", meaning: "and" },
  { hanzi: "很", pinyin: "hěn", meaning: "very" },
  { hanzi: "后面", pinyin: "hòumiàn", meaning: "behind" },
  { hanzi: "回", pinyin: "huí", meaning: "to return" },
  { hanzi: "会", pinyin: "huì", meaning: "can; to know how to" },
  { hanzi: "几", pinyin: "jǐ", meaning: "how many (small numbers)" },
  { hanzi: "家", pinyin: "jiā", meaning: "home; family" },
  { hanzi: "叫", pinyin: "jiào", meaning: "to be called" },
  { hanzi: "今天", pinyin: "jīntiān", meaning: "today" },
  { hanzi: "九", pinyin: "jiǔ", meaning: "nine" },
  { hanzi: "开", pinyin: "kāi", meaning: "to open; to drive" },
  { hanzi: "看", pinyin: "kàn", meaning: "to look at" },
  { hanzi: "看见", pinyin: "kànjiàn", meaning: "to see" },
  { hanzi: "块", pinyin: "kuài", meaning: "yuan (colloquial money unit)" },
  { hanzi: "来", pinyin: "lái", meaning: "to come" },
  { hanzi: "老师", pinyin: "lǎoshī", meaning: "teacher" },
  { hanzi: "了", pinyin: "le", meaning: "aspect particle (completed/change)" },
  { hanzi: "冷", pinyin: "lěng", meaning: "cold" },
  { hanzi: "里", pinyin: "lǐ", meaning: "inside" },
  { hanzi: "六", pinyin: "liù", meaning: "six" },
  { hanzi: "妈妈", pinyin: "māma", meaning: "mom" },
  { hanzi: "吗", pinyin: "ma", meaning: "question particle" },
  { hanzi: "买", pinyin: "mǎi", meaning: "to buy" },
  { hanzi: "猫", pinyin: "māo", meaning: "cat" },
  { hanzi: "没关系", pinyin: "méi guānxi", meaning: "it doesn't matter" },
  { hanzi: "没有", pinyin: "méiyǒu", meaning: "to not have; there isn't" },
  { hanzi: "米饭", pinyin: "mǐfàn", meaning: "cooked rice" },
  { hanzi: "名字", pinyin: "míngzi", meaning: "name" },
  { hanzi: "明天", pinyin: "míngtiān", meaning: "tomorrow" },
  { hanzi: "哪", pinyin: "nǎ", meaning: "which" },
  { hanzi: "哪儿", pinyin: "nǎr", meaning: "where" },
  { hanzi: "那", pinyin: "nà", meaning: "that" },
  { hanzi: "呢", pinyin: "ne", meaning: "particle (and you?)" },
  { hanzi: "能", pinyin: "néng", meaning: "can; to be able to" },
  { hanzi: "你", pinyin: "nǐ", meaning: "you" },
  { hanzi: "年", pinyin: "nián", meaning: "year" },
  { hanzi: "女儿", pinyin: "nǚ'ér", meaning: "daughter" },
  { hanzi: "朋友", pinyin: "péngyou", meaning: "friend" },
  { hanzi: "漂亮", pinyin: "piàoliang", meaning: "pretty" },
  { hanzi: "苹果", pinyin: "píngguǒ", meaning: "apple" },
  { hanzi: "七", pinyin: "qī", meaning: "seven" },
  { hanzi: "前面", pinyin: "qiánmiàn", meaning: "in front of" },
  { hanzi: "钱", pinyin: "qián", meaning: "money" },
  { hanzi: "请", pinyin: "qǐng", meaning: "please; to invite" },
  { hanzi: "去", pinyin: "qù", meaning: "to go" },
  { hanzi: "热", pinyin: "rè", meaning: "hot" },
  { hanzi: "人", pinyin: "rén", meaning: "person" },
  { hanzi: "认识", pinyin: "rènshi", meaning: "to know (a person)" },
  { hanzi: "三", pinyin: "sān", meaning: "three" },
  { hanzi: "商店", pinyin: "shāngdiàn", meaning: "shop; store" },
  { hanzi: "上", pinyin: "shàng", meaning: "on; above; to attend" },
  { hanzi: "上午", pinyin: "shàngwǔ", meaning: "morning (before noon)" },
  { hanzi: "少", pinyin: "shǎo", meaning: "few; little" },
  { hanzi: "谁", pinyin: "shéi", meaning: "who" },
  { hanzi: "什么", pinyin: "shénme", meaning: "what" },
  { hanzi: "十", pinyin: "shí", meaning: "ten" },
  { hanzi: "时候", pinyin: "shíhou", meaning: "time; moment" },
  { hanzi: "是", pinyin: "shì", meaning: "to be" },
  { hanzi: "书", pinyin: "shū", meaning: "book" },
  { hanzi: "水", pinyin: "shuǐ", meaning: "water" },
  { hanzi: "水果", pinyin: "shuǐguǒ", meaning: "fruit" },
  { hanzi: "睡觉", pinyin: "shuìjiào", meaning: "to sleep" },
  { hanzi: "说", pinyin: "shuō", meaning: "to speak" },
  { hanzi: "四", pinyin: "sì", meaning: "four" },
  { hanzi: "岁", pinyin: "suì", meaning: "years old" },
  { hanzi: "他", pinyin: "tā", meaning: "he" },
  { hanzi: "她", pinyin: "tā", meaning: "she" },
  { hanzi: "太", pinyin: "tài", meaning: "too; extremely" },
  { hanzi: "天气", pinyin: "tiānqì", meaning: "weather" },
  { hanzi: "听", pinyin: "tīng", meaning: "to listen" },
  { hanzi: "同学", pinyin: "tóngxué", meaning: "classmate" },
  { hanzi: "喂", pinyin: "wèi", meaning: "hello (on the phone)" },
  { hanzi: "我", pinyin: "wǒ", meaning: "I; me" },
  { hanzi: "我们", pinyin: "wǒmen", meaning: "we" },
  { hanzi: "五", pinyin: "wǔ", meaning: "five" },
  { hanzi: "喜欢", pinyin: "xǐhuan", meaning: "to like" },
  { hanzi: "下", pinyin: "xià", meaning: "under; below" },
  { hanzi: "下午", pinyin: "xiàwǔ", meaning: "afternoon" },
  { hanzi: "下雨", pinyin: "xiàyǔ", meaning: "to rain" },
  { hanzi: "先生", pinyin: "xiānsheng", meaning: "sir; Mr." },
  { hanzi: "现在", pinyin: "xiànzài", meaning: "now" },
  { hanzi: "想", pinyin: "xiǎng", meaning: "to want to; to miss" },
  { hanzi: "小", pinyin: "xiǎo", meaning: "small" },
  { hanzi: "小姐", pinyin: "xiǎojiě", meaning: "miss; Ms." },
  { hanzi: "些", pinyin: "xiē", meaning: "some" },
  { hanzi: "写", pinyin: "xiě", meaning: "to write" },
  { hanzi: "谢谢", pinyin: "xièxie", meaning: "thanks" },
  { hanzi: "星期", pinyin: "xīngqī", meaning: "week" },
  { hanzi: "学生", pinyin: "xuésheng", meaning: "student" },
  { hanzi: "学习", pinyin: "xuéxí", meaning: "to study" },
  { hanzi: "学校", pinyin: "xuéxiào", meaning: "school" },
  { hanzi: "一", pinyin: "yī", meaning: "one" },
  { hanzi: "一点儿", pinyin: "yìdiǎnr", meaning: "a little" },
  { hanzi: "衣服", pinyin: "yīfu", meaning: "clothes" },
  { hanzi: "医生", pinyin: "yīshēng", meaning: "doctor" },
  { hanzi: "医院", pinyin: "yīyuàn", meaning: "hospital" },
  { hanzi: "椅子", pinyin: "yǐzi", meaning: "chair" },
  { hanzi: "有", pinyin: "yǒu", meaning: "to have; there is" },
  { hanzi: "月", pinyin: "yuè", meaning: "month; moon" },
  { hanzi: "再见", pinyin: "zàijiàn", meaning: "goodbye" },
  { hanzi: "在", pinyin: "zài", meaning: "at; in; to be at" },
  { hanzi: "怎么", pinyin: "zěnme", meaning: "how" },
  { hanzi: "怎么样", pinyin: "zěnmeyàng", meaning: "how about; how is" },
  { hanzi: "这", pinyin: "zhè", meaning: "this" },
  { hanzi: "中国", pinyin: "Zhōngguó", meaning: "China" },
  { hanzi: "中午", pinyin: "zhōngwǔ", meaning: "noon" },
  { hanzi: "住", pinyin: "zhù", meaning: "to live" },
  { hanzi: "桌子", pinyin: "zhuōzi", meaning: "table" },
  { hanzi: "字", pinyin: "zì", meaning: "character" },
  { hanzi: "昨天", pinyin: "zuótiān", meaning: "yesterday" },
  { hanzi: "坐", pinyin: "zuò", meaning: "to sit; to travel by" },
  { hanzi: "做", pinyin: "zuò", meaning: "to do" },
];

export const HSK1_GRAMMAR: TrackGrammar[] = [
  {
    slug: "shi-sentences",
    title: "是 sentences",
    explanation:
      "The basic statement pattern: A 是 B (A is B). 是 never takes 了, and is not used before adjectives.",
    example: "我是学生。",
    example_translation: "I am a student.",
  },
  {
    slug: "ma-questions",
    title: "吗 questions",
    explanation:
      "Add 吗 at the end of a statement to turn it into a yes/no question. The word order does not change.",
    example: "你是老师吗？",
    example_translation: "Are you a teacher?",
  },
  {
    slug: "ne-particle",
    title: "呢 — \"and you?\"",
    explanation:
      "呢 after a noun or pronoun asks \"what about…?\" or \"and you?\" — it bounces the question back.",
    example: "我很好，你呢？",
    example_translation: "I'm fine, and you?",
  },
  {
    slug: "question-words",
    title: "Question words",
    explanation:
      "谁 (who), 什么 (what), 哪 (which), 哪儿 (where), 几 (how many), 多少 (how much). They sit exactly where the answer would go — no reordering.",
    example: "你叫什么名字？",
    example_translation: "What's your name?",
  },
  {
    slug: "de-possession",
    title: "的 — possession",
    explanation:
      "N + 的 + N marks possession or description. 的 can be dropped for close relations (我妈妈).",
    example: "这是我的书。",
    example_translation: "This is my book.",
  },
  {
    slug: "you-have",
    title: "有 — to have",
    explanation:
      "有 means \"to have\" or \"there is\". The negative is always 没有, and 有 takes no 了 for simple possession.",
    example: "我有一个朋友。",
    example_translation: "I have a friend.",
  },
  {
    slug: "bu-negation",
    title: "不 — negation",
    explanation:
      "不 goes before verbs and adjectives to negate present/future states and habits.",
    example: "我不是学生。",
    example_translation: "I'm not a student.",
  },
  {
    slug: "mei-you",
    title: "没有 — negation of 有",
    explanation:
      "The negative of 有 is always 没有, never 不有. 没有 also negates past actions.",
    example: "我没有钱。",
    example_translation: "I don't have money.",
  },
  {
    slug: "dou",
    title: "都 — all / both",
    explanation:
      "都 comes after the subject and before the verb: \"subject + 都 + verb\".",
    example: "我们都是学生。",
    example_translation: "We are all students.",
  },
  {
    slug: "hen-adj",
    title: "很 + adjective",
    explanation:
      "Adjectives act like verbs in Chinese — no 是. 很 links subject and adjective, often with a very weak \"very\" meaning.",
    example: "我很好。",
    example_translation: "I'm fine.",
  },
  {
    slug: "tai-le",
    title: "太…了",
    explanation:
      "太 + adjective + 了 expresses \"so/too…\" with emotion. The 了 is required.",
    example: "太好了！",
    example_translation: "Great!",
  },
  {
    slug: "numbers",
    title: "Numbers 1–99",
    explanation:
      "十一 (11), 二十 (20), 二十五 (25), 九十九 (99). Tens and units simply stack.",
    example: "我有三十本书。",
    example_translation: "I have thirty books.",
  },
  {
    slug: "liang-vs-er",
    title: "两 vs 二",
    explanation:
      "两 is used before measure words (两个人); 二 is used in counting and numbers (二十, 十二).",
    example: "两个人",
    example_translation: "two people",
  },
  {
    slug: "measure-words",
    title: "Measure words",
    explanation:
      "Chinese nouns need a measure word between number and noun: 个 (generic), 本 (books), 块 (money), 岁 (age).",
    example: "三个苹果",
    example_translation: "three apples",
  },
  {
    slug: "time-words",
    title: "Time words",
    explanation:
      "今天 / 明天 / 昨天 / 现在 usually open the sentence, before the subject or right after it.",
    example: "今天我学习汉语。",
    example_translation: "Today I study Chinese.",
  },
  {
    slug: "dates",
    title: "Dates: 年月日星期",
    explanation:
      "Order: 年 → 月 → 日/号, and 星期 for the weekday. \"What date is it?\" = 今天几月几号？",
    example: "今天八月十七号。",
    example_translation: "Today is August 17th.",
  },
  {
    slug: "clock-time",
    title: "Clock time: 点/分/半",
    explanation:
      "点 = o'clock, 分 = minutes, 半 = half past. Ask with 几: 现在几点？",
    example: "现在三点半。",
    example_translation: "It's half past three now.",
  },
  {
    slug: "zai-location",
    title: "在 — location",
    explanation:
      "S + 在 + place says where someone/something is. 在 also means \"to be doing\" before a verb.",
    example: "我在学校。",
    example_translation: "I'm at school.",
  },
  {
    slug: "qu-lai-place",
    title: "去 / 来 + place",
    explanation:
      "去 (go to) and 来 (come to) take a place directly — no preposition needed.",
    example: "我去北京。",
    example_translation: "I'm going to Beijing.",
  },
  {
    slug: "hui-neng",
    title: "会 / 能 — can",
    explanation:
      "会 = learned skill (会说汉语); 能 = ability or possibility (能来吗？). Both go before the main verb.",
    example: "我会说汉语。",
    example_translation: "I can speak Chinese.",
  },
  {
    slug: "xiang",
    title: "想 — want to",
    explanation:
      "想 + verb = \"would like to\". 想 + noun = \"to miss\" (我想妈妈).",
    example: "我想喝茶。",
    example_translation: "I'd like some tea.",
  },
  {
    slug: "xihuan",
    title: "喜欢 — to like",
    explanation:
      "喜欢 + noun/verb. \"Really like\" = 很喜欢. Not 很喜欢了.",
    example: "我喜欢吃米饭。",
    example_translation: "I like eating rice.",
  },
  {
    slug: "he-connector",
    title: "和 — and (nouns only)",
    explanation:
      "和 connects nouns and pronouns — never clauses or adjectives. For verbs, just list them (我吃饭喝水).",
    example: "我和你",
    example_translation: "you and I",
  },
  {
    slug: "le-aspect",
    title: "了 — completed / change",
    explanation:
      "了 after a verb marks completion; 了 at sentence end marks a new state. Both can appear together.",
    example: "我吃饭了。",
    example_translation: "I've eaten.",
  },
  {
    slug: "adj-predicate",
    title: "Adjectives without 是",
    explanation:
      "Adjectives are predicates by themselves: 今天很冷, not 今天是冷. Negate with 不: 不冷.",
    example: "今天很冷。",
    example_translation: "Today is cold.",
  },
  {
    slug: "zenmeyang",
    title: "怎么样 — how is it?",
    explanation:
      "怎么样 asks for an opinion or a state, placed at the end: N + 怎么样？",
    example: "这本书怎么样？",
    example_translation: "How is this book?",
  },
  {
    slug: "shenme-shihou",
    title: "什么时候 — when",
    explanation:
      "什么时候 goes before the verb: 你什么时候去？ (Answer: 明天/现在.)",
    example: "你什么时候去学校？",
    example_translation: "When do you go to school?",
  },
  {
    slug: "duo-adj",
    title: "多 + adjective — how…?",
    explanation:
      "多 before adjectives asks degree: 多大 (how old), 多远 (how far). 了 is common: 多大了？",
    example: "你多大了？",
    example_translation: "How old are you?",
  },
  {
    slug: "ji-vs-duoshao",
    title: "几 vs 多少",
    explanation:
      "几 expects a small number, usually with a measure word (几个人, 几点); 多少 expects bigger numbers or money (多少钱).",
    example: "这多少钱？",
    example_translation: "How much is this?",
  },
  {
    slug: "jiao-called",
    title: "叫 — to be called",
    explanation:
      "我叫 + name introduces yourself. Ask \"what is your name?\" with 你叫什么名字？",
    example: "我叫Serhat。",
    example_translation: "My name is Serhat.",
  },
  {
    slug: "sui-age",
    title: "岁 — age",
    explanation:
      "Number + 岁 states age. Ask with 多大了？ or 几岁了？",
    example: "我二十五岁。",
    example_translation: "I'm 25 years old.",
  },
  {
    slug: "kuai-money",
    title: "块 — money",
    explanation:
      "块 is the spoken unit for yuan (元 is formal). 三块五 = 3.5 yuan.",
    example: "三块钱",
    example_translation: "three yuan",
  },
  {
    slug: "zenme",
    title: "怎么 — how",
    explanation:
      "怎么 + verb asks about manner: 怎么去？ (How to get there?) 怎么读？ (How to read/pronounce it?)",
    example: "怎么去学校？",
    example_translation: "How do I get to school?",
  },
  {
    slug: "politeness-set",
    title: "Politeness set",
    explanation:
      "The survival four: 请 (please), 谢谢 (thanks) / 不客气 (you're welcome), 对不起 (sorry) / 没关系 (no problem).",
    example: "请坐。",
    example_translation: "Please sit.",
  },
];
