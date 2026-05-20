export function amountToWords(amount: number): string {
  if (amount === 0) return 'Zero Rupees Only';

  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ',
    'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  const convertBlock = (n: number): string => {
    let str = '';
    if (n > 99) {
      str += a[Math.floor(n / 100)] + 'Hundred ';
      n = n % 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + ' ';
      n = n % 10;
    }
    if (n > 0) {
      str += a[n];
    }
    return str;
  };

  const convertAmount = (num: number): string => {
    let str = '';
    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;
    const hundred = num;

    if (crore > 0) str += convertBlock(crore) + 'Crore ';
    if (lakh > 0) str += convertBlock(lakh) + 'Lakh ';
    if (thousand > 0) str += convertBlock(thousand) + 'Thousand ';
    if (hundred > 0) str += convertBlock(hundred);

    return str.trim();
  };

  const wholeNumber = Math.floor(amount);
  const paise = Math.round((amount - wholeNumber) * 100);

  let result = convertAmount(wholeNumber) + ' Rupees';

  if (paise > 0) {
    result += ' and ' + convertAmount(paise) + ' Paise';
  }

  return result + ' Only';
}
