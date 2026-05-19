export const EMOJI_CATEGORIES = [
  {
    id: 'facebook',
    title: 'Cảm xúc trên Facebook',
    icon: '👍',
    emojis: ['👍', '❤️', '😆', '😮', '😢', '😡']
  },
  {
    id: 'smileys',
    title: 'Mặt cười và hình người',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇',
      '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑',
      '🤗', '🫣', '🤭', '🤫', '🫡', '🤔', '🫵', '👍', '👎', '✊', '👊',
      '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚',
      '🤝', '🙏', '💪', '✍️', '💅', '🤳', '👂', '👃', '👀', '👁️', '👅', '👄'
    ]
  },
  {
    id: 'animals',
    title: 'Động vật và thiên nhiên',
    icon: '🐱',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮',
      '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣',
      '🐥', '🦆', '🦅', '🦉', '🦤', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛',
      '🦋', '🐌', '🐞', '🐜', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🐙', '🦑', '🦀'
    ]
  },
  {
    id: 'food',
    title: 'Đồ ăn và thức uống',
    icon: '🍔',
    emojis: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭',
      '🍍', '🥥', '🥝', '🍅', '🍆', '🌶️', '🫑', '🧅', '🧄', '🥕', '🌽', '🍟',
      '🍔', '🍕', '🌭', '🥪', '🌮', '🌯', '🍳', '🍲', '🍿', '🍱', '🍘', '🍙', '🍚'
    ]
  },
  {
    id: 'activities',
    title: 'Hoạt động và thể thao',
    icon: '⚽',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🏓', '🏒',
      '🏑', '🎣', '🥊', '🥋', '🎽', 'skateboard', '⛸️', '🏹'
    ]
  },
  {
    id: 'travel',
    title: 'Du lịch và địa điểm',
    icon: '🚗',
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛',
      '🚜', '🛵', '🚲', '🛴', '🏍️', '🚂', '🚇', '✈️', '⛵', '⚓', '🛸', '🚀', '🌋', '🗻'
    ]
  },
  {
    id: 'objects',
    title: 'Đồ vật',
    icon: '💡',
    emojis: [
      '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🕹️', '💽', '💾',
      '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '📞', '☎️', '📟', '📠', '🔌', '💡'
    ]
  },
  {
    id: 'symbols',
    title: 'Biểu tượng',
    icon: '🔣',
    emojis: [
      '💘', '❤️‍🔥', '❤️‍🩹', '❤️', '🩷', '🧡', '💛', '💚', '💙', '🩵', '💜', '🤎', '🖤',
      '🩶', '🤍', '💋', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💬', '👁️‍🗨️'
    ]
  }
];

export const EMOJI_SEARCH_MAP: { char: string; tags: string[] }[] = [
  { char: '👍', tags: ['like', 'tot', 'thich', 'ok', 'up', 'nhat', 'agree', 'dong y'] },
  { char: '❤️', tags: ['tim', 'love', 'yeu', 'heart', 'red', 'do', 'thuong'] },
  { char: '😆', tags: ['cuoi', 'haha', 'fun', 'laugh', 'hihi', 'hehe'] },
  { char: '😂', tags: ['cuoi', 'haha', 'lol', 'laugh', 'khoc cuoi', 'funny'] },
  { char: '😮', tags: ['wow', 'o', 'shocked', 'nga nhien', 'bat ngo', 'surprised'] },
  { char: '😢', tags: ['khoc', 'sad', 'buon', 'cry', 'nuoc mat', 'te'] },
  { char: '😡', tags: ['gian', 'angry', 'do', 'tuc giu', 'hate', 'bad'] },
  { char: '🙏', tags: ['cam on', 'pray', 'xin', 'xin loi', 'please', 'thanks', 'chuc'] },
  { char: '😀', tags: ['cuoi', 'happy', 'cuoi he rang', 'vui'] },
  { char: '😃', tags: ['cuoi', 'happy', 'vui'] },
  { char: '😄', tags: ['cuoi', 'happy', 'vui'] },
  { char: '😁', tags: ['cuoi', 'happy', 'toe toet'] },
  { char: '😅', tags: ['cuoi', 'vui', 'mo hoi', 'cuoi tru'] },
  { char: '🤣', tags: ['cuoi', 'lan lon', 'haha'] },
  { char: '🙂', tags: ['mim cuoi', 'smile', 'nhin'] },
  { char: '🙃', tags: ['nguoc', 'lon nguoc', 'quay cuong'] },
  { char: '😉', tags: ['nhay mat', 'wink', 'treu'] },
  { char: '😊', tags: ['cuoi', 'ngai', 'do mat', 'cute'] },
  { char: '😇', tags: ['thien than', 'ngoan', 'angel'] },
  { char: '🥰', tags: ['yeu', 'love', '3 tim', 'hanh phuc'] },
  { char: '😍', tags: ['yeu', 'love', 'mat tim', 'thich'] },
  { char: '🤩', tags: ['sao', 'mat sao', 'star'] },
  { char: '😘', tags: ['hon', 'kiss', 'yeu'] },
  { char: '😋', tags: ['ngon', 'them', 'delicious', 'food'] },
  { char: '😛', tags: ['le luoi', 'tongue', 'treu'] },
  { char: '😜', tags: ['le luoi', 'nhay mat', 'wink'] },
  { char: '🤪', tags: ['dien', 'crazy', 'ngao'] },
  { char: '😝', tags: ['le luoi', 'nham mat'] },
  { char: '🤑', tags: ['tien', 'money', 'giau'] },
  { char: '🤗', tags: ['om', 'hug', 'vui'] },
  { char: '🫣', tags: ['he', 'nhin len', 'peek'] },
  { char: '🤭', tags: ['che mieng', 'ngai', 'giggle'] },
  { char: '🤫', tags: ['suyt', 'shh', 'quiet', 'im hang'] },
  { char: '🫡', tags: ['chao', 'nghiem', 'salute'] },
  { char: '🤔', tags: ['nghi', 'think', 'suy nghi'] },
  { char: '🫵', tags: ['chi', 'ban', 'you', 'point'] },
  { char: '👎', tags: ['dislike', 'che', 'kem', 'down'] },
  { char: '✊', tags: ['nam dam', 'quyet tam', 'fist'] },
  { char: '👊', tags: ['dam', 'fist', 'punch'] },
  { char: '✌️', tags: ['peace', 'hai', 'v', 'victory'] },
  { char: '🤟', tags: ['love', 'rock', 'yeu'] },
  { char: '🤘', tags: ['rock', 'metal'] },
  { char: '👌', tags: ['ok', 'dong y', 'good'] },
  { char: '🤌', tags: ['gi', 'cai gi', 'what'] },
  { char: '🤏', tags: ['mot chut', 'it', 'small'] },
  { char: '💪', tags: ['khoe', 'manh', 'strong', 'co bap'] },
  { char: '🤝', tags: ['bat tay', 'shake', 'deal', 'hop tac'] },
  { char: '🐶', tags: ['cho', 'dog', 'cun', 'puppy'] },
  { char: '🐱', tags: ['meo', 'cat', 'kitten'] },
  { char: '🐭', tags: ['chuot', 'mouse'] },
  { char: '🐰', tags: ['tho', 'rabbit', 'bunny'] },
  { char: '🦊', tags: ['cao', 'fox'] },
  { char: '🐻', tags: ['gau', 'bear'] },
  { char: '🐼', tags: ['gau truc', 'panda'] },
  { char: '🦁', tags: ['su tu', 'lion'] },
  { char: '🐮', tags: ['bo', 'cow'] },
  { char: '🐷', tags: ['heo', 'lon', 'pig'] },
  { char: '🐸', tags: ['ech', 'frog'] },
  { char: '🐒', tags: ['khi', 'monkey'] },
  { char: '🐔', tags: ['ga', 'chicken'] },
  { char: '🐧', tags: ['chim canh cut', 'penguin'] },
  { char: '🐦', tags: ['chim', 'bird'] },
  { char: '🐝', tags: ['ong', 'bee'] },
  { char: '🕷️', tags: ['nhen', 'spider'] },
  { char: '🐢', tags: ['rua', 'turtle'] },
  { char: '🐍', tags: ['ran', 'snake'] },
  { char: '🐙', tags: ['bach tuoc', 'octopus'] },
  { char: '🦀', tags: ['cua', 'crab'] },
  { char: '🍔', tags: ['hamburger', 'burger', 'banh mi'] },
  { char: '🍕', tags: ['pizza', 'banh'] },
  { char: '🌭', tags: ['hotdog', 'xuc xich'] },
  { char: '⚽', tags: ['da bong', 'bong da', 'soccer', 'football'] },
  { char: '🏀', tags: ['bong ro', 'basketball'] },
  { char: '🚗', tags: ['oto', 'car', 'xe'] },
  { char: '🏍️', tags: ['xe may', 'motor'] },
  { char: '💡', tags: ['den', 'y tuong', 'light', 'idea'] }
];

export const removeAccents = (str: string) => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
};
