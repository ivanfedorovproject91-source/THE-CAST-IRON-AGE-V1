/* ===== Персонажи: внешность (постоянная), расписание, подарки, диалоги ===== */
(function () {
  const G = (window.G = window.G || {});
  const D = (G.D = G.D || {});

  // at: {loc, days, p (шанс присутствия за час), l: обеденная локация, eve: городская локация}
  // rel0: стартовое отношение; rel: надёжность по долгам (%)
  // talk: [{t, c?:cond, o:[[кнопка, ответ, fx]]}]  fx.rel.me = отношение к этому НПС
  D.NPC = {
    truhanov: {
      name: 'Труханов Б. К.', full: 'Труханов Барнаул Кулебякович', age: 50, role: 'Генеральный директор', color: '#a33',
      ap: { skin: '#e0a38a', shape: 'round', hair: 'comb', hc: '#6b5a48', brow: 'thick', eyes: 'small', nose: 'red', mouth: 'flat', stache: 'brush', glasses: 'gold', cloth: '#2a2b33', collar: 'chain', extra: ['flush', 'bino'] },
      at: { loc: 'admin', days: [0, 3, 4], p: 0.25, l: 'canteen' }, likes: ['cognac', 'env5', 'watch3'], dislikes: ['milk'], rel: 0,
      talk: [
        { t: 'Труханов проходит мимо и косится: «Эй, ты… {tn}! Почему не за станком? Я тут миллиарды… ну, неважно.»', o: [['Извините, уже бегу', 'Он кивает, не слушая. «Правильно».', { boss: 2, cons: -1 }], ['Я на перерыве', '«Перерыв — для слабых». Он удаляется.', { boss: -2, mood: -2 }], ['Молчать и смотреть в пол', 'Он ушёл, довольный собственным величием.', { boss: 1 }]] },
        { t: '«А вот скажи мне, {tn}, как тебя там… Ты ведь любишь наш завод?»', o: [['Люблю! Очень!', '«Молодец. Хоть один любит». Он хмыкает и идёт дальше.', { boss: 4, cons: -3 }], ['Он меня тоже… пока', 'Директор смеётся так, будто не понял шутки.', { boss: 0, cool: 2 }], ['Нет', '«Тогда зачем тут стоишь?» В блокнотик что-то записал.', { note: 'Дерзость', boss: -5 }]] },
        { t: 'Директор рассказывает про свой Майбах: «Салон — как у людей! Вот у тебя есть Майбах? Нет? А зря».', o: [['Мечтаю о таком', '«Мечтай-мечтай». Смотрит на тебя как на пыль.', { boss: 1 }], ['Мой — на колёсах из чугуна', 'Он не понял, но на всякий случай рассмеялся.', { boss: 2, cool: 1 }]] }
      ]
    },
    soplezhuykin: {
      name: 'Соплежуйкин М. Г.', full: 'Соплежуйкин Максим Гогенович', age: 33, role: 'Зам. генерального директора', color: '#6a5',
      ap: { skin: '#f0cdb8', shape: 'long', hair: 'slick', hc: '#2b2420', brow: 'thin', eyes: 'norm', nose: 'pointy', mouth: 'smirk', glasses: 'none', cloth: '#303a50', collar: 'bowtie', extra: ['bigforehead', 'sheen'] },
      at: { loc: 'admin', days: [1, 3], p: 0.7 }, likes: ['cognac', 'perfume', 'watch2', 'env5', 'tie'], dislikes: ['beer', 'cigs'], rel: 0,
      talk: [
        { t: 'Соплежуйкин вертит папку: «А вы вообще кто? Ах да, станок №… ну, да».', o: [['Здравствуйте, Максим Гогенович!', 'Он расплывается в улыбке. «Вот видите, воспитанный».', { boss: 2, coll: -1 }], ['Я работаю тут', '«Все работают». Он что-то помечает в папке.', {}], ['Пошёл ты', 'Он краснеет и скрывается. В папке — новая запись.', { note: 'Хамство', boss: -6, cool: 5 }]] },
        { t: '«Слышал, у вас в бригаде кто-то опаздывает? Не подскажете, кто?»', o: [['Не знаю', '«Ну-ну». Он разочарован.', { boss: -1, coll: 2 }], ['Серёга, кажется', '«Ценю сознательность». В папку что-то записал.', { rel: { soplezhuykin: 8, seryoga: -12 }, snitch: 1, coll: -6, cons: -6, boss: 5 }]] }
      ]
    },
    shurygina: {
      name: 'Шурыгина В. М.', full: 'Шурыгина Валентина Матвеевна', age: 80, role: 'Главный бухгалтер', color: '#c66',
      ap: { skin: '#f1d7c2', shape: 'round', hair: 'dandelion', hc: '#d8d8d8', brow: 'thin', eyes: 'bino', nose: 'small', mouth: 'smile', glasses: 'round', cloth: '#7a4a6a', collar: 'brooch', extra: ['wart', 'flush'] },
      at: { loc: 'admin', days: [0, 1, 2, 3], p: 0.9 }, likes: ['choco', 'cake', 'flowers'], dislikes: ['vodka'], rel: 0,
      talk: [
        { t: 'Шурыгина кричит из-за стола: «Деточка, у меня тут цифры не сходятся! Ты считать умеешь?!»', o: [['Умею', '«Тогда иди и считай где-нибудь ещё!»', {}], ['Помогу, Валентина Матвеевна', 'Она растрогана: «Хороший мальчик. Возьми конфету».', { rel: { shurygina: 6 }, mood: 2 }], ['Это не ко мне', '«Хам!» — летит степлер. Промахнулась.', { mood: -3, rel: { shurygina: -4 } }]] },
        { t: 'Где-то сзади раздаётся звук. Шурыгина невозмутима: «Это скрипит кресло».', o: [['Открыть окно', 'Она благодарно кивает.', { rel: { shurygina: 4 }, health: 1 }], ['Сделать вид', 'Вы оба смотрите на документы. Победили.', { cool: 1 }], ['Громко засмеяться', '«Нахал!» — тебя выгнали из кабинета.', { rel: { shurygina: -6 }, mood: 4 }]] }
      ]
    },
    tatishcheva: {
      name: 'Татищева Т. К.', full: 'Татищева Тамара Кондратьевна', age: 25, role: 'Начальница отдела кадров', color: '#e9a', romance: true,
      ap: { skin: '#f7ddc7', shape: 'oval', hair: 'long', hc: '#b8905a', brow: 'thin', eyes: 'big', nose: 'small', mouth: 'lips', glasses: 'none', cloth: '#3b3f4d', collar: 'none', extra: ['lashes'] },
      at: { loc: 'admin', days: [0, 1, 2, 3, 4], p: 0.95 }, likes: ['flowers', 'perfume', 'rafaello', 'jewelry'], dislikes: [], rel: 8,
      rom: { speed: 0.7, trap: true },
      talk: [
        { t: 'Татищева мило улыбается: «Ну как вы тут? Вас никто не обижает?»', o: [['Всё хорошо, спасибо', '«Приятно слышать!» У неё очень красивые глаза.', { rel: { tatishcheva: 4 }, mood: 3 }], ['Работы много', '«Я вам сочувствую». Она вздыхает так, что у тебя дрожит коленка.', { rel: { tatishcheva: 3 }, mood: 2 }], ['Вы слишком добры. Подозрительно', 'Она замирает на секунду и снова улыбается. «Что вы!»', { rel: { tatishcheva: -2 }, cons: 2 }]] },
        { t: '«Если что-то понадобится по бумагам — заходите. Я для вас всё сделаю».', o: [['Обязательно зайду', '«Буду ждать».', { rel: { tatishcheva: 4 } }], ['А директор не против?', 'Улыбка стала на секунду холодной. «Директору не до этого».', { rel: { tatishcheva: -1 }, cons: 1 }]] }
      ]
    },
    eblanov: {
      name: 'Ебланов М. Е.', full: 'Ебланов Марат Ебланович', age: 45, role: 'Конструктор', color: '#889',
      ap: { skin: '#cfc2b0', shape: 'round', hair: 'messy', hc: '#4a4038', brow: 'thick', eyes: 'tired', nose: 'red', mouth: 'frown', stache: 'none', beard: 'stubble', glasses: 'none', cloth: '#6b6b60', collar: 'none', extra: ['bags', 'flush'] },
      at: { loc: 'admin', days: [0, 1, 2, 3, 4], p: 0.85 }, likes: ['vodka', 'beer', 'cigs'], dislikes: ['milk'], rel: 0, reliab: 20,
      talk: [
        { t: 'Ебланов сидит, обняв чертёжную доску: «Все меня обижают, Вася… ты ведь Вася?»', o: [['Пожалеть', 'Он всхлипывает: «Хоть ты человек». Достаёт чертёж получше.', { rel: { eblanov: 10 }, cons: 3, mood: -1, flag: { eblGood: 1 } }], ['Выпить с ним', 'Вы выпиваете. Он обещает чертежи. Потом уходит в запой.', { rel: { eblanov: 12 }, drunk: 20, flag: { eblBinge: 1 }, coll: 2 }], ['Дать подзатыльник', 'Он съёживается. Чертежи в ближайшие недели станут лучше.', { rel: { eblanov: -10 }, cons: -4, flag: { eblBeaten: 1 }, cool: 2 }]] },
        { t: '«Я вообще-то инженер, у меня вот диплом… где-то был. А чертежи — это искусство, не математика!»', o: [['Согласиться', '«Вот! Вот кто понимает!» — он расцвёл.', { rel: { eblanov: 6 } }], ['Это брак, а не искусство', 'Он тихо плачет в кружку.', { rel: { eblanov: -4 }, cons: -1 }]] }
      ]
    },
    lyudka: {
      name: 'Людка', full: 'Людмила Петровна', age: 50, role: 'Кухарка', color: '#e84', romance: true, gossip: true,
      ap: { skin: '#ecc3a5', shape: 'round', hair: 'curls', hc: '#d4552a', brow: 'thin', eyes: 'big', nose: 'small', mouth: 'lips', glasses: 'none', cloth: '#f2f2f0', collar: 'none', extra: ['earrings', 'flush'] },
      at: { loc: 'canteen', days: [0, 1, 2, 3, 4], p: 1 }, likes: ['flowers', 'cake', 'vodka', 'choco'], dislikes: [], rel: 5, reliab: 80,
      rom: { speed: 0.5 },
      talk: [
        { t: 'Людка гремит черпаком: «Молодой, чего такой грустный? Подкинуть добавки?»', o: [['Давай, Людмила Петровна', 'Она наваливает щедро. Сытость +, настроение +.', { satiety: 10, mood: 3, rel: { lyudka: 3 } }], ['Спасибо, не надо', '«Ну смотри, худой как швабра».', {}], ['А что за слухи ходят?', 'Она наклоняется: «Не слухи, а новости…» — и рассказывает такое, что уши вянут.', { mood: 2, flag: { rumor: 1 } }]] },
        { t: '«У меня в молодости было таких, как ты, штабель! Только штабель — он падал».', o: [['Рассмеяться', 'Она хохочет на всю столовую.', { rel: { lyudka: 3 }, mood: 4 }], ['Смутиться', 'Она подмигивает: «Ничего, привыкнешь».', { rel: { lyudka: 1 } }]] }
      ]
    },
    tatyana: {
      name: 'Татьяна', full: 'Татьяна', age: 30, role: 'Кухарка', color: '#9bd', romance: true,
      ap: { skin: '#f6dccb', shape: 'oval', hair: 'braids', hc: '#b08a5a', brow: 'light', eyes: 'big', nose: 'small', mouth: 'smile', glasses: 'none', cloth: '#f2f2f0', collar: 'none', extra: ['freckles', 'blush'] },
      at: { loc: 'canteen', days: [0, 1, 2, 3, 4], p: 1 }, likes: ['flowers', 'book', 'rafaello', 'tickets'], dislikes: ['vodka'], rel: 2, reliab: 90,
      rom: { speed: 0.9 },
      talk: [
        { t: 'Татьяна краснеет, подавая тарелку: «Вам… побольше картошечки?»', o: [['Спасибо, Таня', 'Она улыбается и прячет глаза.', { rel: { tatyana: 4 }, mood: 3 }], ['Ты очень добрая', 'Уши у неё стали красными. В хлебе записка: «Приятного».', { rel: { tatyana: 6 }, mood: 4, cons: 1 }]] },
        { t: 'Татьяна тихо спрашивает: «А вы читаете? Мне вот «Мастер и Маргарита» понравилась…»', o: [['Люблю эту книгу', 'Она сияет. «Вы такой… не такой, как все».', { rel: { tatyana: 7 }, mood: 4 }], ['Я больше по инструкциям', 'Она хихикает. Тоже неплохо.', { rel: { tatyana: 2 } }]] }
      ]
    },
    pelageya: {
      name: 'Пелагея Ф.', full: 'Пелагея Фёдоровна', age: 42, role: 'Инженер по охране труда', color: '#8c8', romance: true,
      ap: { skin: '#f0d3bd', shape: 'oval', hair: 'kosynka', hc: '#6a5a40', brow: 'light', eyes: 'norm', nose: 'small', mouth: 'smile', glasses: 'round', hat: 'kosynka', cloth: '#55663f', collar: 'none', extra: [] },
      at: { loc: 'admin', days: [0, 1, 2, 3, 4], p: 0.9 }, likes: ['choco', 'book', 'tickets', 'cake', 'flowers'], dislikes: ['vodka', 'beer'], rel: 5,
      rom: { speed: 1 },
      talk: [
        { t: 'Пелагея протягивает пирожок: «Покушай, ты бледный. На заводе без пирожков нельзя».', o: [['Спасибо большое', 'Пирожок с капустой. Лучший за всю неделю.', { satiety: 12, mood: 4, rel: { pelageya: 5 } }], ['Я на диете', '«Какая диета на заводе?!» — она обижена.', { rel: { pelageya: -2 } }]] },
        { t: 'Пелагея тихо говорит о муже: «Он тоже думал, что ничего не случится…»', o: [['Выслушать', 'Она долго рассказывает. Ты уходишь с тяжёлым сердцем и лёгкой душой.', { rel: { pelageya: 8 }, cons: 3, mood: -2 }], ['Мне пора', 'Она кивает. «Береги себя».', { rel: { pelageya: -1 } }]] }
      ]
    },
    tamara: {
      name: 'Тамара', full: 'Тамара (уборщица)', age: 55, role: 'Уборщица', color: '#bb7', romance: true,
      ap: { skin: '#e5bea3', shape: 'square', hair: 'kosynka', hc: '#8a7a68', brow: 'thick', eyes: 'norm', nose: 'big', mouth: 'smile', glasses: 'none', hat: 'kosynka', cloth: '#586a8a', collar: 'none', extra: ['flush'] },
      at: { loc: 'shop', alt: ['locker', 'yard'], days: [0, 1, 2, 3, 4], p: 0.5 }, likes: ['vodka', 'cake', 'choco'], dislikes: [], rel: 3,
      rom: { speed: 0.8 },
      talk: [
        { t: 'Тамара тащит ведро: «Милок, помоги донести, спина совсем».', o: [['Помочь', '«Золотой ты мой». Она сует тебе пирожок.', { rel: { tamara: 6 }, energy: -3, satiety: 8, cons: 2 }], ['Не могу', '«Ну и ладно». Она вздыхает.', { rel: { tamara: -2 } }]] },
        { t: 'Тамара шепчет: «Если что, в подсобке никто не ходит. Начальство там не смотрит».', o: [['Спасибо, Тамара', 'Она подмигивает. Теперь ты знаешь, где можно прикорнуть.', { rel: { tamara: 3 }, flag: { podsobka: 1 } }], ['Не надо', '«Как знаешь, милок».', {}]] }
      ]
    },
    nadezhda: {
      name: 'Надежда Н.', full: 'Надежда Николаевна', age: 47, role: 'Проверяющая по ОТ', color: '#d55', romance: true,
      ap: { skin: '#eacdb5', shape: 'long', hair: 'bun', hc: '#3d2f28', brow: 'angry', eyes: 'small', nose: 'pointy', mouth: 'lips', glasses: 'square', cloth: '#6a2a30', collar: 'none', extra: ['lashes'] },
      at: { loc: 'shop', days: [2], p: 0.9, from: 10 }, likes: ['choco', 'perfume', 'flowers', 'wine'], dislikes: ['vodka'], rel: -4,
      rom: { speed: 1.2, special: true },
      talk: [
        { t: 'Надежда Николаевна холодно смотрит: «Опять без перчаток?»', o: [['Простите, исправлюсь', 'Она хмыкает. Но что-то записать не стала.', { rel: { nadezhda: 2 }, boss: 1 }], ['Они порвались', '«Сменить. Немедленно».', {}], ['Какая у вас помада красивая', 'Она слегка краснеет и отворачивается. Забавно.', { rel: { nadezhda: 5 } }]] }
      ]
    },
    lidiya: {
      name: 'Лидия Н.', full: 'Лидия Николаевна', age: 65, role: 'Крановщица', color: '#cc9', romance: true,
      ap: { skin: '#e2bba2', shape: 'round', hair: 'curls', hc: '#bbb', brow: 'light', eyes: 'norm', nose: 'big', mouth: 'smile', glasses: 'round', hat: 'beanie', cloth: '#7a6a50', collar: 'none', extra: [] },
      at: { loc: 'shop', days: [0, 1, 2, 3, 4], p: 1 }, likes: ['cake', 'cigs', 'choco', 'book'], dislikes: [], rel: 4,
      rom: { speed: 1 },
      talk: [
        { t: 'Лидия Николаевна свешивается из кабины: «Солнышко, иди ко мне, чайку налью!»', o: [['Зайти в кабину', 'Чай с мёдом и пирожное. Ты чувствуешь себя внуком.', { mood: 5, rel: { lidiya: 5 }, energy: 4 }], ['Некогда', '«Всегда вы заняты...» — вздыхает она.', { rel: { lidiya: -1 } }]] },
        { t: '«Директор с биноклем идёт! — шепчет она из кабины. — Ты тут не стой».', o: [['Спасибо за предупреждение', 'Она кивает — и снова вяжет.', { rel: { lidiya: 3 }, flag: { warned: 1 } }]] }
      ]
    },
    ekaterina: {
      name: 'Екатерина Е.', full: 'Екатерина Евгеньевна', age: 35, role: 'Начальница ОТК', color: '#f8c', romance: true,
      ap: { skin: '#f4d9c6', shape: 'oval', hair: 'bob', hc: '#2b2020', brow: 'thin', eyes: 'norm', nose: 'small', mouth: 'lips', glasses: 'square', cloth: '#f4f4f2', collar: 'coat', extra: ['lashes'] },
      at: { loc: 'otk', days: [0, 1, 2, 3, 4], p: 1 }, likes: ['book', 'tickets', 'wine', 'flowers'], dislikes: ['vodka', 'env1', 'env5'], rel: -6,
      rom: { speed: 1.6, hard: true },
      talk: [
        { t: 'Екатерина Евгеньевна даже не поднимает глаз: «Допуск по ГОСТу? Нет? Тогда не тратьте моё время».', o: [['Прошу прощения', 'Она слегка кивает.', { rel: { ekaterina: 1 } }], ['Вот деталь, проверьте', 'Она молча измеряет. «Допустимо». Для неё это комплимент.', { rel: { ekaterina: 3 }, know: 1 }], ['Вы очень красивая', '«Это не критерий приёмки».', { rel: { ekaterina: -3 } }]] },
        { t: '«Скажите, — говорит она сухо, — вы читали чертёж или рисовали по памяти?»', o: [['Проверял, нашёл ошибку', 'Её брови чуть поднялись. Уважение.', { rel: { ekaterina: 5 }, know: 1 }], ['По памяти', '«Заметно».', { rel: { ekaterina: -3 }, boss: -1 }]] }
      ]
    },
    lyosha: {
      name: 'Дядя Лёша', full: 'Дядя Лёша', age: 58, role: 'Охранник на проходной', color: '#9a8',
      ap: { skin: '#e3b99c', shape: 'round', hair: 'bald', hc: '#aaa', brow: 'thick', eyes: 'norm', nose: 'big', mouth: 'smile', stache: 'walrus', glasses: 'none', hat: 'cap', cloth: '#394a3d', collar: 'none', extra: ['flush'] },
      at: { loc: 'checkpoint', days: [0, 1, 2, 3, 4], p: 1, morning: true }, likes: ['vodka', 'cigs', 'beer'], dislikes: [], rel: 4,
      talk: [
        { t: 'Дядя Лёша мурлыкает шансон: «Заходи, не бойся. Пропуск есть? Ну и хорошо».', o: [['Угостить сигаретой', 'Он довольно затягивается. «Если что — предупрежу».', { rel: { lyosha: 8 }, cons: 0 }], ['Спросить про проверку', '«В среду Надежда придёт. Ты там того, не дыши».', { rel: { lyosha: 2 }, flag: { hintWed: 1 } }]] }
      ]
    },
    gosha: {
      name: 'Гоша «Танк»', full: 'Гоша «Танк»', age: 42, role: 'Начальник охраны', color: '#788',
      ap: { skin: '#dcb394', shape: 'square', hair: 'buzz', hc: '#403a30', brow: 'angry', eyes: 'small', nose: 'big', mouth: 'flat', glasses: 'none', cloth: '#262b30', collar: 'none', extra: ['scar'] },
      at: { loc: 'yard', days: [0, 1, 2, 3, 4], p: 0.9 }, likes: ['vodka', 'cognac', 'env1'], dislikes: [], rel: -2,
      talk: [
        { t: 'Гоша «Танк» смотрит из-под бровей: «Что несёшь? Показывай карманы».', o: [['Показать карманы', 'Он ворчит, но отпускает. Формалист.', { boss: 1 }], ['Шутить', '«Шути на проходной с кем-нибудь другим».', { rel: { gosha: -2 } }]] }
      ]
    },
    palych: {
      name: 'Палыч', full: 'Палыч (бригадир)', age: 62, role: 'Бригадир, наставник', color: '#b95',
      ap: { skin: '#d7ae8f', shape: 'long', hair: 'short', hc: '#cfcfcf', brow: 'thick', eyes: 'norm', nose: 'big', mouth: 'smile', stache: 'walrus', glasses: 'none', hat: 'cap', cloth: '#475a6f', collar: 'none', extra: ['wrinkles'] },
      at: { loc: 'shop', days: [0, 1, 2, 3, 4], p: 1 }, likes: ['vodka', 'cigs', 'beer'], dislikes: [], rel: 8, reliab: 85,
      talk: [
        { t: 'Палыч не отрывается от станка: «Главное — не торопись. И не пей на работе. Ну, не при мне».', o: [['Научи, Палыч', 'Он показывает приём. Знания +.', { know: 3, rel: { palych: 3 } }], ['Как на рыбалку?', '«Рыбалка — это жизнь».', { rel: { palych: 4 }, mood: 3 }], ['Дай закурить', 'Он протягивает мятую пачку. «Бери. Но один раз».', { mood: 2, rel: { palych: 1 } }]] },
        { t: '«Знаешь, сынок, этот завод — как жена: ругаешь, но уйти не можешь».', o: [['Мудро', 'Он довольно усмехается.', { rel: { palych: 3 } }], ['А я уйду', '«Все так говорят». Ему грустно.', { rel: { palych: -1 }, cons: 1 }]] }
      ]
    },
    stepanych: {
      name: 'Степаныч', full: 'Егор Степаныч (мастер)', age: 48, role: 'Мастер участка', color: '#aa9',
      ap: { skin: '#e0b896', shape: 'round', hair: 'bald', hc: '#888', brow: 'light', eyes: 'small', nose: 'small', mouth: 'flat', glasses: 'none', cloth: '#555', collar: 'none', extra: [] },
      at: { loc: 'shop', days: [0, 1, 2, 3, 4], p: 0.55 }, likes: ['vodka', 'env1', 'cigs'], dislikes: [], rel: 0,
      talk: [
        { t: 'Степаныч лениво листает наряды: «Сделаешь — премию получишь. Наверное».', o: [['Сделаю', '«Вот и молодец, иди».', { boss: 2 }], ['А точно?', '«Я не обещаю, я говорю».', {}]] }
      ]
    },
    vityok: {
      name: 'Витёк', full: 'Витёк (наладчик)', age: 30, role: 'Наладчик', color: '#cb7',
      ap: { skin: '#e9c2a5', shape: 'long', hair: 'bangs', hc: '#a0643c', brow: 'light', eyes: 'norm', nose: 'small', mouth: 'smile', glasses: 'none', cloth: '#3f5a48', collar: 'none', extra: ['freckles', 'oil'] },
      at: { loc: 'shop', alt: ['yard'], days: [0, 1, 2, 3, 4], p: 0.6 }, likes: ['beer', 'vodka'], dislikes: [], rel: 3, reliab: 40,
      talk: [
        { t: 'Витёк вытирает руки о промасленную ветошь: «Слышь, одолжи тысячку до получки!»', o: [['Дать 500', 'Он берёт, не моргнув. «Верну, как только… ну, скоро».', { money: -500, rel: { vityok: 6 }, flag: { lent_vityok: 500 } }], ['Отказать', '«Жмот» — шепчет себе под нос.', { rel: { vityok: -4 } }]] },
        { t: '«Станок у тебя совсем убитый. Могу глянуть — если поможешь с гаражом в субботу».', o: [['Помогу', 'Он кивает: «С меня ремонт».', { rel: { vityok: 5 }, flag: { vityokOwes: 1 } }], ['Сам разберусь', 'Он пожимает плечами.', {}]] }
      ]
    },
    seryoga: {
      name: 'Серёга', full: 'Серёга (напарник)', age: 28, role: 'Напарник', color: '#7ac',
      ap: { skin: '#e6bfa2', shape: 'oval', hair: 'cap', hc: '#4c3e30', brow: 'thick', eyes: 'norm', nose: 'small', mouth: 'smile', glasses: 'none', hat: 'cap', cloth: '#6f4f3a', collar: 'none', extra: ['scar'] },
      at: { loc: 'shop', days: [0, 1, 2, 3, 4], p: 0.9 }, likes: ['beer', 'vodka', 'cigs'], dislikes: [], rel: 5, reliab: 55,
      talk: [
        { t: 'Серёга шепчет: «Слушай, прикрой меня, я на полчасика отойду. Если что — я в туалете».', o: [['Прикрою', 'Он хлопает по плечу.', { rel: { seryoga: 6 }, coll: 3, cons: -1 }], ['Отказать', 'Он обижен, но поймёт.', { rel: { seryoga: -3 } }], ['Сдать мастеру', 'Степаныч кивает. Серёга уже в курсе.', { rel: { seryoga: -15 }, snitch: 1, coll: -6, boss: 4, cons: -6 }]] },
        { t: '«Пойдём в субботу на рыбалку? С Палычем. Он обещал показать место».', o: [['Пойдём', 'Ты записан в рыбаки.', { rel: { seryoga: 4, palych: 2 } }], ['Не люблю воду', 'Он смеётся: «Так сухим и ходи».', {}]] }
      ]
    },
    mikhalych: {
      name: 'Михалыч', full: 'Михалыч (сварщик)', age: 55, role: 'Сварщик', color: '#e87',
      ap: { skin: '#d9967a', shape: 'round', hair: 'none', hc: '#aaa', brow: 'thick', eyes: 'tired', nose: 'red', mouth: 'smile', stache: 'none', beard: 'full', glasses: 'none', cloth: '#444', collar: 'none', extra: ['flush'] },
      at: { loc: 'shop', alt: ['yard'], days: [0, 1, 2, 3, 4], p: 0.6 }, likes: ['vodka', 'beer', 'cigs'], dislikes: ['milk'], rel: 2, reliab: 50,
      talk: [
        { t: 'Михалыч дышит так, что у тебя слезятся глаза: «Я вчера немного… того. Но варю — как бог!»', o: [['Дотащить до подсобки', 'Ты тащишь его по цеху. Он храпит.', { energy: -5, rel: { mikhalych: 10 }, coll: 3, cons: 2 }], ['Сдать мастеру', 'Степаныч выговаривает Михалычу. Тот запомнит.', { rel: { mikhalych: -12 }, snitch: 1, coll: -5, boss: 3, cons: -5 }], ['Пройти мимо', 'Сам разберётся.', {}]] }
      ]
    },
    semyonych: {
      name: 'Семёныч', full: 'Семёныч (профсоюз)', age: 57, role: 'Председатель профсоюза', color: '#79b',
      ap: { skin: '#e2c0a4', shape: 'oval', hair: 'comb', hc: '#777', brow: 'light', eyes: 'norm', nose: 'small', mouth: 'smile', glasses: 'round', cloth: '#2f4058', collar: 'bowtie', extra: [] },
      at: { loc: 'admin', days: [0, 1, 2, 3, 4], p: 0.6 }, likes: ['choco', 'cognac', 'cigs'], dislikes: [], rel: 0, reliab: 60,
      talk: [
        { t: 'Семёныч листает папку: «Нужно подождать. Всегда нужно подождать. Вступать будете?»', o: [['Расскажите про профсоюз', 'Он рассказывает долго и с цифрами. Ты кивнул — и уснул стоя.', { energy: 2, know: 1 }], ['Потом', '«Всегда «потом»…»', {}]] }
      ]
    },
    alevtina: {
      name: 'Алевтина И.', full: 'Алевтина Игоревна', age: 40, role: 'Медсестра', color: '#8db',
      ap: { skin: '#f0cfbb', shape: 'round', hair: 'bun', hc: '#7a5a3a', brow: 'thin', eyes: 'norm', nose: 'small', mouth: 'smile', glasses: 'none', cloth: '#f0f6f6', collar: 'none', extra: ['blush'] },
      at: { loc: 'med', days: [0, 1, 2, 3, 4], p: 1 }, likes: ['choco', 'cake', 'flowers'], dislikes: [], rel: 3,
      talk: [
        { t: 'Алевтина строго смотрит: «Пил молоко? Нет? Тогда садись, послушаем лёгкие».', o: [['Сесть', 'Послушала, покачала головой. «Пей молоко».', { health: 2, rel: { alevtina: 2 } }], ['Принёс шоколадку', 'Она чуть смягчилась.', { rel: { alevtina: 6 } }]] }
      ]
    },
    kolyan: {
      name: 'Колян', full: 'Колян (старый друг)', age: 30, role: 'Старый друг', color: '#c85',
      ap: { skin: '#e0b898', shape: 'square', hair: 'buzz', hc: '#403a30', brow: 'thick', eyes: 'small', nose: 'big', mouth: 'smile', glasses: 'none', cloth: '#242424', collar: 'chain', extra: ['tattoo'] },
      at: { loc: 'c_ryum', days: [0, 1, 2, 3, 4, 5, 6], p: 0.7, city: true }, likes: ['vodka', 'beer', 'cigs'], dislikes: [], rel: 15, reliab: 70,
      talk: [
        { t: 'Колян хлопает по плечу: «Ну что, трудяга? Как там твой Чугунный век? Налить?»', o: [['Налей', 'Вы чокаетесь. Вечер обещает быть долгим.', { drunk: 22, mood: 8, craving: -20, rel: { kolyan: 5 }, money: -150 }], ['Занять тысячу', '«Держи. Отдашь когда сможешь». (Колян всё помнит.)', { money: 1000, rel: { kolyan: -2 }, flag: { debt_kolyan: 1000 } }], ['Пожаловаться на жизнь', 'Он слушает и поддакивает: «Все они там…»', { mood: 5, rel: { kolyan: 4 } }]] },
        { t: '«Если кого надо «побеседовать» — ты скажи. Я людей знаю».', o: [['Пошутить', 'Он не смеётся.', { cons: -1 }], ['Спросить всерьёз', 'Он смотрит внимательно: «Когда готов будешь — приходи».', { flag: { sportiki_hint: 1 }, cons: -3 }]] }
      ]
    },
    rublev: {
      name: 'Эдуард Рублёв', full: 'Эдуард Рублёв', age: 38, role: 'Менеджер «Рубль-Банка»', color: '#9cf',
      ap: { skin: '#f0d0b8', shape: 'oval', hair: 'slick', hc: '#2b2b2b', brow: 'thin', eyes: 'norm', nose: 'small', mouth: 'smile', glasses: 'none', cloth: '#263a5a', collar: 'tie', extra: ['teeth'] },
      at: { loc: 'c_bank', days: [0, 1, 2, 3, 4], p: 1, city: true }, likes: [], dislikes: [], rel: 0,
      talk: [{ t: 'Рублёв улыбается всеми зубами: «Для вас — особые условия! Всего 34% годовых!»', o: [['Спасибо, подумаю', '«Подумайте-подумайте».', {}]] }]
    },
    rafik: {
      name: 'Рафик', full: 'Рафик (водитель Майбаха)', age: 35, role: 'Водитель директора', color: '#aa8',
      ap: { skin: '#d2a47c', shape: 'square', hair: 'short', hc: '#1c1814', brow: 'thick', eyes: 'norm', nose: 'big', mouth: 'flat', stache: 'thin', glasses: 'none', cloth: '#1c1c1c', collar: 'tie', extra: [] },
      at: { loc: 'yard', days: [0, 3, 4], p: 0.4 }, likes: ['cigs', 'vodka', 'env1'], dislikes: [], rel: 0,
      talk: [{ t: 'Рафик курит у Майбаха: «Директор сегодня приедет к двум. Или не приедет. Или приедет, но пьяный».', o: [['Угостить сигаретой', 'Он кивает и делится расписанием на неделю.', { rel: { rafik: 6 }, flag: { rafikTip: 1 } }]] }]
    },
    khomyak: {
      name: 'Вован «Хомяк»', full: 'Вован «Хомяк»', age: 33, role: 'Кладовщик', color: '#dc8',
      ap: { skin: '#eac0a0', shape: 'round', hair: 'short', hc: '#6a4a30', brow: 'light', eyes: 'small', nose: 'small', mouth: 'smile', glasses: 'none', cloth: '#5a4a38', collar: 'none', extra: ['cheeks'] },
      at: { loc: 'locker', alt: ['yard'], days: [0, 1, 2, 3, 4], p: 0.5 }, likes: ['env1'], dislikes: [], rel: 0, reliab: 30,
      talk: [{ t: 'Хомяк щурится: «Если что плохо лежит — я куплю. За долю».', o: [['Запомнил', 'Он довольно потирает ладони.', { rel: { khomyak: 3 } }]] }]
    },
    nyura: {
      name: 'Баба Нюра', full: 'Бабушка Нюра', age: 74, role: 'Соседка по общаге', color: '#bba',
      ap: { skin: '#e8cdb6', shape: 'round', hair: 'kosynka', hc: '#ccc', brow: 'light', eyes: 'small', nose: 'big', mouth: 'smile', glasses: 'none', hat: 'kosynka', cloth: '#6a5a74', collar: 'none', extra: ['wrinkles'] },
      at: { loc: 'home', days: [0, 1, 2, 3, 4, 5, 6], p: 0.8, city: true }, likes: ['choco', 'cake', 'cigs'], dislikes: [], rel: 4,
      talk: [{ t: 'Баба Нюра суёт банку: «Бери огурцы, милый, а то худой, как чугунная палка».', o: [['Взять огурцы', 'Сытость и добрые чувства.', { satiety: 12, mood: 3, rel: { nyura: 4 } }], ['Постирать ей бельё за деньги', 'Она заплатила 300 ₽ и накормила супом.', { money: 300, satiety: 8, energy: -4, rel: { nyura: 3 } }]] }]
    },
    allochka: {
      name: 'Аллочка', full: 'Аллочка (секретарша)', age: 29, role: 'Секретарь приёмной', color: '#f9c',
      ap: { skin: '#f6dac8', shape: 'round', hair: 'long', hc: '#e0c070', brow: 'thin', eyes: 'big', nose: 'small', mouth: 'lips', glasses: 'none', cloth: '#cc77aa', collar: 'none', extra: ['lashes'] },
      at: { loc: 'admin', days: [0, 1, 2, 3, 4], p: 0.9 }, likes: ['choco', 'rafaello'], dislikes: [], rel: 0,
      talk: [{ t: 'Аллочка жуёт жвачку: «Он занят. Он на совещании. Он вообще… ну, занят».', o: [['Оставить шоколадку', 'Она улыбается: «Ладно, запишу тебя».', { rel: { allochka: 8 } }], ['Уйти', 'Она вернулась к телефону.', {}]] }]
    },
    zahar: {
      name: 'Захар', full: 'Захар (стажёр)', age: 21, role: 'Новый стажёр', color: '#bd8',
      ap: { skin: '#eac5ab', shape: 'long', hair: 'spiky', hc: '#c09050', brow: 'light', eyes: 'big', nose: 'big', mouth: 'smile', glasses: 'none', hat: 'helmet', cloth: '#4c6a8a', collar: 'none', extra: ['freckles'] },
      at: { loc: 'shop', days: [0, 1, 2, 3, 4], p: 0.7 }, likes: ['beer', 'cigs'], dislikes: [], rel: 0,
      talk: [{ t: 'Захар смотрит на тебя восхищённо: «А тут правда молоко бесплатно дают?! Класс!»', o: [['Научить', 'Он старается. Ты чувствуешь себя мудрым.', { rel: { zahar: 6 }, coll: 2, boss: 1, know: 1, energy: -2 }], ['Подшутить над ним', 'Он покраснел, но запомнил.', { rel: { zahar: -3 }, mood: 3 }]] }]
    },
    vika: {
      name: 'Вика', full: 'Вика (админ зала)', age: 26, role: 'Администратор спортзала', color: '#f88',
      ap: { skin: '#f3d3be', shape: 'oval', hair: 'ponytail', hc: '#4a3a30', brow: 'thin', eyes: 'norm', nose: 'small', mouth: 'smile', glasses: 'none', cloth: '#222', collar: 'none', extra: [] },
      at: { loc: 'c_gym', days: [0, 1, 2, 3, 4, 5, 6], p: 1, city: true }, likes: ['choco', 'flowers'], dislikes: [], rel: 0,
      talk: [{ t: 'Вика улыбается: «Абонемент оформим? Месяц — восемь тысяч, всего-то».', o: [['Подумаю', '«Подумайте, подумайте».', {}]] }]
    },
    chugunok: {
      name: 'Чугунок', full: 'Заводской кот Чугунок', age: 5, role: 'Рыжий кот', color: '#f93',
      ap: { cat: true, skin: '#e8943c', cloth: '#e8943c' },
      at: { loc: 'shop', alt: ['canteen', 'yard'], days: [0, 1, 2, 3, 4], p: 0.35 }, likes: [], dislikes: [], rel: 0,
      talk: [{ t: 'Чугунок трётся о ногу и мурлычет.', o: [['Погладить', '+12 настроения. Кот — лучшее, что есть на заводе.', { mood: 12, rel: { chugunok: 6 }, flag: { cat: 1 } }], ['Дать кусочек котлеты', 'Теперь ты — друг навсегда.', { mood: 8, rel: { chugunok: 12 }, satiety: -3 }]] }]
    },
    belka: {
      name: 'Белка', full: 'Белка в каске', age: 0, role: '???', color: '#fa5',
      ap: { squirrel: true, skin: '#b66a30', cloth: '#b66a30' },
      at: null, likes: [], dislikes: [], rel: 0, talk: []
    }
  };

  D.NPC_ORDER = ['tatishcheva', 'palych', 'seryoga', 'vityok', 'mikhalych', 'stepanych', 'lyosha', 'gosha', 'pelageya', 'nadezhda', 'ekaterina', 'eblanov', 'shurygina', 'soplezhuykin', 'truhanov', 'allochka', 'lyudka', 'tatyana', 'tamara', 'lidiya', 'alevtina', 'semyonych', 'khomyak', 'rafik', 'zahar', 'chugunok', 'kolyan', 'nyura', 'rublev', 'vika'];

  // Слухи Людки применяются при flag.rumor
  D.ROM_STAGES = ['Не знакомы', 'Знакомство', 'Симпатия', 'Флирт', 'Свидания', 'Отношения', 'Близость', 'Глубокие отношения'];
})();
