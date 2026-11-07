export const indexHistory = [
  [2004, 2175.44], [2007, 2652.28], [2008, 1577.03], [2009, 2269.15],
  [2013, 4176.59], [2016, 5383.12], [2018, 6635.28], [2019, 8972.60],
  [2020, 12888.28], [2021, 15644.97], [2022, 10466.48], [2023, 15011.35],
  [2024, 19310.79],
] as const;

type Localized = [string, string, string];
type Lesson = {
  title: Localized;
  story: Localized;
  question: Localized;
  options: [Localized, Localized, Localized];
  answer: number;
  takeaway: Localized;
};
export const lessons: Lesson[] = [
  {
    title: ['The $1,000 time machine', 'La machine à remonter le temps', '1,000 美元时光机'],
    story: ['Imagine $1,000 moved in step with the Nasdaq Composite from the end of 2004. Explore the chart to see what would have happened along the way.', 'Imaginez que 1 000 $ suivent le Nasdaq Composite depuis fin 2004. Explorez la courbe pour découvrir leur parcours.', '假设 1,000 美元从 2004 年底开始跟随纳斯达克综合指数变化。拖动图表，看看沿途发生了什么。'],
    question: ['Did the value rise at every point on the chart?', 'La valeur monte-t-elle à chaque étape ?', '图中的金额每次都比上一个点高吗？'],
    options: [['Yes, every time', 'Oui, à chaque fois', '是，每次都涨'], ['No, there were drops', 'Non, il y a eu des baisses', '不是，中途有下跌'], ['The value stayed flat', 'La valeur est restée stable', '金额保持不变']],
    answer: 1,
    takeaway: ['The value fell in 2008 and 2022. The starting date and the time you have to stay invested both matter.', 'La valeur a baissé en 2008 et en 2022. Le point de départ et la durée de placement comptent.', '2008 年和 2022 年都出现了下跌。起点和你能持有的时间都会影响结果。'],
  },
  {
    title: ['Meet the companies behind the line', 'Les entreprises derrière la courbe', '曲线背后的公司'],
    story: ['A share is a small ownership stake in a company. An index follows a group of shares. When investors expect companies to earn more in the future, they may be willing to pay more today.', 'Une action représente une petite part d’une entreprise. Un indice suit un groupe d’actions. Si les investisseurs anticipent de meilleurs bénéfices, ils peuvent accepter de payer plus cher aujourd’hui.', '股票代表公司的一小份所有权，指数跟踪一组股票。当投资者预期公司未来赚得更多，他们今天可能愿意支付更高的价格。'],
    question: ['What does a share represent?', 'Que représente une action ?', '股票代表什么？'],
    options: [['A small part of a company', 'Une petite part d’une entreprise', '公司的一小份所有权'], ['A fixed interest payment', 'Un intérêt fixe', '固定利息'], ['A list of market prices', 'Une liste de cours', '一份市场价格表']],
    answer: 0,
    takeaway: ['Buying a share gives you a stake in the business. What that stake is worth can change as expectations change.', 'Une action vous donne une part de l’entreprise. Sa valeur évolue avec les attentes.', '持有股票就拥有了公司的一小份权益。随着预期变化，这份权益的价格也会变。'],
  },
  {
    title: ['When growth earns growth', 'Quand les gains produisent des gains', '收益也能再生收益'],
    story: ['Try a steady annual rate on $1,000. Each year, the next gain is calculated on the new balance. This is compounding.', 'Testez un taux annuel constant sur 1 000 $. Chaque année, les gains se calculent sur le nouveau solde. C’est la capitalisation.', '给 1,000 美元设置一个固定年利率。每年按新的余额计算利息，这就是复利。'],
    question: ['At 10% a year, how much is $1,000 worth after two years?', 'À 10 % par an, que deviennent 1 000 $ en deux ans ?', '如果年利率为 10%，1,000 美元两年后是多少？'],
    options: [['$1,100', '1 100 $', '1,100 美元'], ['$1,200', '1 200 $', '1,200 美元'], ['$1,210', '1 210 $', '1,210 美元']],
    answer: 2,
    takeaway: ['Year one adds $100. Year two adds 10% of $1,100, which is $110. Actual market returns vary and can be negative.', 'La première année ajoute 100 $. La deuxième ajoute 10 % de 1 100 $, soit 110 $. Les rendements du marché varient et peuvent être négatifs.', '第一年增加 100 美元，第二年按 1,100 美元计算，增加 110 美元。实际市场回报会波动，也可能为负。'],
  },
  {
    title: ['Why markets stumble', 'Pourquoi les marchés trébuchent', '市场为什么会跌'],
    story: ['Prices change when expectations change. Higher interest rates can make borrowing costlier and reduce what investors are willing to pay for future profits. Earnings and fear can also move prices.', 'Les cours évoluent avec les attentes. Des taux plus élevés peuvent renchérir les emprunts et réduire le prix que les investisseurs acceptent de payer pour des bénéfices futurs. Les résultats et la peur jouent aussi un rôle.', '市场价格会随预期而变化。利率上升可能提高借钱的成本，也可能降低投资者愿意为未来利润支付的价格。企业业绩和恐慌情绪也会影响市场。'],
    question: ['What can happen to share prices when expectations worsen?', 'Que peuvent faire les cours si les attentes se dégradent ?', '如果市场预期变差，股价可能会怎样？'],
    options: [['They are locked in', 'Ils restent fixes', '保持不变'], ['They can fall', 'Ils peuvent baisser', '可能下跌'], ['They always double', 'Ils doublent toujours', '必然翻倍']],
    answer: 1,
    takeaway: ['A market drop is a change in prices. In the long run, outcomes also depend on earnings, what investors paid, and how conditions evolve.', 'Une baisse correspond à un changement de prix. À long terme, les bénéfices, le prix d’achat et l’évolution du contexte comptent aussi.', '下跌是价格变化。长期结果还取决于企业盈利、买入时的价格和之后的经济环境。'],
  },
  {
    title: ['How people get started', 'Comment débuter', '普通人如何参与'],
    story: ['An index is a measuring tool. Some funds aim to follow an index by holding a basket of investments. Buying a fund can spread exposure across companies, though its value can still fall.', 'Un indice est un outil de mesure. Certains fonds suivent un indice en détenant un panier de placements. Un fonds peut répartir le risque entre plusieurs entreprises, et sa valeur peut baisser.', '指数是衡量市场的工具。一些基金通过持有一篮子资产来跟踪指数。买基金可以分散对单家公司的风险，但基金也可能下跌。'],
    question: ['What can holding a basket of companies help with?', 'Quel est l’intérêt d’un panier d’entreprises ?', '持有一篮子公司有什么好处？'],
    options: [['Guarantee a gain', 'Garantir un gain', '保证盈利'], ['Remove all risk', 'Éliminer tout risque', '消除全部风险'], ['Rely less on one company', 'Dépendre moins d’une seule entreprise', '减少对单家公司的依赖']],
    answer: 2,
    takeaway: ['A basket spreads company-specific risk. Time horizon, access to cash, and fees are useful things to compare before making a decision.', 'Un panier répartit le risque propre à chaque entreprise. L’horizon, la disponibilité de l’argent et les frais aident à comparer les options.', '一篮子资产能分散单一公司的风险。做决定前，可以比较资金使用时间、取用灵活性和费用。'],
  },
  {
    title: ['The grocery basket', 'Le panier de courses', '同一篮菜，为什么更贵了？'],
    story: ['Your usual groceries rise from $50 to $55. When prices rise broadly, we call it inflation. The same money then buys less.', 'Vos courses habituelles passent de 50 à 55 $. Une hausse générale des prix s’appelle l’inflation. La même somme permet alors d’acheter moins.', '你常买的一篮食品从 50 涨到了 55 美元。当很多商品一起涨价，这叫通货膨胀。同样的钱能买到的东西变少了。'],
    question: ['If your budget stays at $50, what changed?', 'Si votre budget reste de 50 $, qu’est-ce qui change ?', '预算仍然是 50 美元，发生了什么变化？'],
    options: [['You can buy less', 'Vous pouvez acheter moins', '能买到的东西变少了'], ['You can buy more', 'Vous pouvez acheter plus', '能买到更多'], ['Your budget grew', 'Votre budget a augmenté', '预算增加了']],
    answer: 0,
    takeaway: ['Purchasing power is what your money can buy. Comparing a basket over time helps reveal how that changes.', 'Le pouvoir d’achat mesure ce que votre argent permet d’acheter. Suivre un panier aide à voir son évolution.', '购买力指你的钱能买到多少东西。对比一篮商品在不同时间的价格，就能看出购买力的变化。'],
  },
  {
    title: ['The surprise repair', 'La réparation surprise', '突如其来的维修费'],
    story: ['Your bike needs an unexpected repair. Money set aside for surprises can help you pay without borrowing at short notice.', 'Votre vélo a besoin d’une réparation imprévue. Une réserve permet de payer sans devoir emprunter dans l’urgence.', '自行车突然需要维修。提前留一笔备用金，就能应付这类支出，少一次临时借钱的压力。'],
    question: ['Which feature matters most for emergency savings?', 'Quelle caractéristique compte le plus pour une épargne de secours ?', '应急储蓄最重要的特点是什么？'],
    options: [['A flashy app', 'Une application sophistiquée', '漂亮的应用界面'], ['Easy access when needed', 'Un accès facile en cas de besoin', '需要时能方便取用'], ['A long lock-up', 'Un blocage de longue durée', '长期锁定']],
    answer: 1,
    takeaway: ['An emergency fund is a cushion for unexpected expenses. Its job is to be available when life changes the plan.', 'Une réserve sert à absorber les dépenses inattendues. Elle doit être disponible quand les plans changent.', '应急金是应对意外支出的缓冲。它的任务是在计划被打乱时随时可用。'],
  },
  {
    title: ['The falling price', 'Le prix qui baisse', '价格跌了，怎么办？'],
    story: ['A price drop makes you want to act right away. Loss aversion describes how losses can feel more intense than gains of the same size.', 'Une baisse vous donne envie d’agir tout de suite. L’aversion aux pertes décrit le fait qu’une perte peut nous affecter davantage qu’un gain équivalent.', '看到价格下跌，你想立刻行动。损失厌恶指的是，同样金额的损失带来的痛苦，可能比盈利带来的快乐更强烈。'],
    question: ['What can help you make a calmer decision?', 'Qu’est-ce qui peut aider à décider plus calmement ?', '怎样能帮你更冷静地做决定？'],
    options: [['Follow the loudest opinion', 'Suivre l’avis le plus bruyant', '跟着声音最大的人走'], ['Ignore your goals', 'Oublier vos objectifs', '忘掉自己的目标'], ['Pause and check what changed', 'Faire une pause et vérifier ce qui a changé', '先停一下，看看什么真的变了']],
    answer: 2,
    takeaway: ['Name the feeling, revisit your goal, and separate the new facts from your first reaction.', 'Nommez l’émotion, relisez votre objectif et distinguez les faits nouveaux de votre première réaction.', '先说出自己的感受，再回顾目标，把新的事实和第一反应分开。'],
  },
  {
    title: ['The subscription puzzle', 'Le casse-tête de l’abonnement', '订阅账单小谜题'],
    story: ['A service costs $12 a month or $120 a year. You only need it for three months. The annual plan has a lower monthly equivalent, but compare what you would actually pay.', 'Un service coûte 12 $ par mois ou 120 $ par an. Vous en avez besoin trois mois. Le tarif annuel revient moins cher par mois, mais comparez la somme réellement payée.', '一个服务月付 12 美元，年付 120 美元。你只需要用三个月。年付折合每月更便宜，但也要比较实际会付多少钱。'],
    question: ['What would three monthly payments cost?', 'Combien coûtent trois mensualités ?', '付三个月一共要多少钱？'],
    options: [['$36', '36 $', '36 美元'], ['$120', '120 $', '120 美元'], ['$144', '144 $', '144 美元']],
    answer: 0,
    takeaway: ['Multiply the monthly price by the months you expect to use. Check cancellation terms before comparing the totals.', 'Multipliez le prix mensuel par la durée d’utilisation prévue. Vérifiez les conditions de résiliation avant de comparer les totaux.', '用月费乘以预计使用的月数，再查看取消条件，就能比较总花费。'],
  },
];

export const courses = [
  { icon: '↗', title: ['Investing', 'Investissement', '投资入门'], detail: ['From Nasdaq to compound interest', 'Du Nasdaq aux intérêts composés', '从纳斯达克到复利'], steps: [0, 1, 2, 3, 4] },
  { icon: '◎', title: ['Economics', 'Économie', '经济常识'], detail: ['Why prices change', 'Pourquoi les prix changent', '价格为什么会变'], steps: [5] },
  { icon: '◇', title: ['Personal finance', 'Finances personnelles', '个人理财'], detail: ['Build a cushion', 'Préparer les imprévus', '给生活留一份缓冲'], steps: [6] },
  { icon: '✦', title: ['Money psychology', 'Psychologie financière', '金钱心理'], detail: ['Decide with a cooler head', 'Décider à tête reposée', '学会冷静做决定'], steps: [7] },
  { icon: '✓', title: ['Everyday decisions', 'Décisions du quotidien', '日常金钱决策'], detail: ['See what a deal really costs', 'Comparer le coût réel', '算清一笔账'], steps: [8] },
];
