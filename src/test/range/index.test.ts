import { describe, expect, it } from 'bun:test'
import { generateSequence } from '../../range/index'
import { MAX_SEQUENCE_LENGTH } from '../../range/normalize'

describe('generateSequence', () => {
  describe('basic functionality', () => {
    it('generates a decimal sequence', () => {
      expect(generateSequence('1:5', 10)).toEqual(['1', '2', '3', '4', '5'])
    })

    it('generates from a single Chinese heavenly stem', () => {
      expect(generateSequence('甲', 4)).toEqual(['甲', '乙', '丙', '丁'])
    })

    it('keeps the lowercase hexadecimal format of the start', () => {
      expect(generateSequence('0xa:0xf', 10)).toEqual([
        '0xa',
        '0xb',
        '0xc',
        '0xd',
        '0xe',
        '0xf',
      ])
    })

    it('keeps the uppercase hexadecimal format of the start', () => {
      expect(generateSequence('0XA:0XF', 10)).toEqual([
        '0XA',
        '0XB',
        '0XC',
        '0XD',
        '0XE',
        '0XF',
      ])
    })

    it('keeps the binary prefix', () => {
      expect(generateSequence('0b1001:0b1100', 10)).toEqual([
        '0b1001',
        '0b1010',
        '0b1011',
        '0b1100',
      ])
    })

    it('keeps the octal prefix', () => {
      expect(generateSequence('0o7:0o12', 10)).toEqual([
        '0o7',
        '0o10',
        '0o11',
        '0o12',
      ])
    })

    it('reads I:V as latin letters, not roman numerals', () => {
      // Single letters are ambiguous; convnum's type priority puts latin_letter first.
      expect(generateSequence('I:V', 10)).toEqual([
        'I',
        'J',
        'K',
        'L',
        'M',
        'N',
        'O',
        'P',
        'Q',
        'R',
      ])
    })

    it('generates lowercase latin letters', () => {
      expect(generateSequence('a:e', 10)).toEqual(['a', 'b', 'c', 'd', 'e'])
    })

    it('generates uppercase latin letters', () => {
      expect(generateSequence('A:E', 10)).toEqual(['A', 'B', 'C', 'D', 'E'])
    })

    it('generates roman numerals when the input can only be roman', () => {
      expect(generateSequence('II:VI', 10)).toEqual([
        'II',
        'III',
        'IV',
        'V',
        'VI',
      ])
    })
  })

  describe('circular systems', () => {
    it('wraps around when the selection count exceeds the system length', () => {
      expect(generateSequence('mon', 8)).toEqual([
        'mon',
        'tue',
        'wed',
        'thu',
        'fri',
        'sat',
        'sun',
        'mon',
      ])
    })

    it('wraps a step larger than the system length', () => {
      // mon is 1, 1+10=11 wraps to 4 (thu), and so on.
      expect(generateSequence('mon::10', 6)).toEqual([
        'mon',
        'thu',
        'sun',
        'wed',
        'sat',
        'tue',
      ])
    })

    it('wraps a negative step', () => {
      // fri is 5, 5-2=3 (wed), 3-2=1 (mon), 1-2=-1 wraps to 6 (sat).
      expect(generateSequence('fri::-2', 4)).toEqual([
        'fri',
        'wed',
        'mon',
        'sat',
      ])
    })

    it('repeats when the step equals the system length', () => {
      expect(generateSequence('tue::7', 4)).toEqual([
        'tue',
        'tue',
        'tue',
        'tue',
      ])
    })

    it('repeats when the step is a multiple of the system length', () => {
      expect(generateSequence('wed::14', 3)).toEqual(['wed', 'wed', 'wed'])
    })

    it('wraps latin letters on a large step', () => {
      // a is 1, 1+30=31 wraps to 5 (e), then 9 (i), then 13 (m).
      expect(generateSequence('a::30', 4)).toEqual(['a', 'e', 'i', 'm'])
    })

    it('wraps month names', () => {
      expect(generateSequence('jan::5', 3)).toEqual(['jan', 'jun', 'nov'])
    })

    it('wraps from the last element of the system', () => {
      expect(generateSequence('sun::1', 3)).toEqual(['sun', 'mon', 'tue'])
    })

    it('repeats on a zero step', () => {
      expect(generateSequence('thu::0', 3)).toEqual(['thu', 'thu', 'thu'])
    })

    it('wraps a step that goes round several times', () => {
      expect(generateSequence('mon::50', 3)).toEqual(['mon', 'tue', 'wed'])
    })

    it('repeats when a negative step equals the system length', () => {
      expect(generateSequence('丙::-10', 3)).toEqual(['丙', '丙', '丙'])
    })
  })

  describe('TypeInfo preservation', () => {
    it('takes the hexadecimal case from the start value', () => {
      const lowercase = generateSequence('0xa:10', 10)
      const uppercase = generateSequence('0XA:10', 10)

      expect(lowercase).not.toEqual(uppercase)
      expect(lowercase[0]).toBe('0xa')
      expect(uppercase[0]).toBe('0XA')
    })

    it('prefers latin letters over hexadecimal for ambiguous input', () => {
      expect(generateSequence('a:d', 10)).toEqual(['a', 'b', 'c', 'd'])
    })

    it('formats with the start TypeInfo even when the stop is written plainly', () => {
      expect(generateSequence('0xa:15', 10)).toEqual([
        '0xa',
        '0xb',
        '0xc',
        '0xd',
        '0xe',
        '0xf',
        '0x10',
        '0x11',
        '0x12',
        '0x13',
      ])
    })

    it('preserves Traditional Chinese, whatever the stop is written in', () => {
      expect(generateSequence('貳', 5)).toEqual(['貳', '叄', '肆', '伍', '陸'])
      expect(generateSequence('貳:陸', 10)).toEqual([
        '貳',
        '叄',
        '肆',
        '伍',
        '陸',
      ])
      expect(generateSequence('貳:陆', 10)).toEqual([
        '貳',
        '叄',
        '肆',
        '伍',
        '陸',
      ])
    })
  })

  describe('month and weekday names in other languages', () => {
    it('counts months in the language they were written in', () => {
      expect(generateSequence('janvier:mars', 10)).toEqual([
        'janvier',
        'février',
        'mars',
      ])
      expect(generateSequence('Januar:März', 10)).toEqual([
        'Januar',
        'Februar',
        'März',
      ])
      expect(generateSequence('enero:marzo', 10)).toEqual([
        'enero',
        'febrero',
        'marzo',
      ])
      expect(generateSequence('январь:март', 10)).toEqual([
        'январь',
        'февраль',
        'март',
      ])
      expect(generateSequence('ocak:mart', 10)).toEqual([
        'ocak',
        'şubat',
        'mart',
      ])
      expect(generateSequence('gennaio:marzo', 10)).toEqual([
        'gennaio',
        'febbraio',
        'marzo',
      ])
      expect(generateSequence('styczeń:marzec', 10)).toEqual([
        'styczeń',
        'luty',
        'marzec',
      ])
      expect(generateSequence('يناير:مارس', 10)).toEqual([
        'يناير',
        'فبراير',
        'مارس',
      ])
      expect(generateSequence('1月:3月', 10)).toEqual(['1月', '2月', '3月'])
    })

    it('counts weekdays in the language they were written in', () => {
      expect(generateSequence('lundi:mercredi', 10)).toEqual([
        'lundi',
        'mardi',
        'mercredi',
      ])
      expect(generateSequence('Montag:Mittwoch', 10)).toEqual([
        'Montag',
        'Dienstag',
        'Mittwoch',
      ])
      expect(generateSequence('星期一:星期三', 10)).toEqual([
        '星期一',
        '星期二',
        '星期三',
      ])
      expect(generateSequence('понедельник:среда', 10)).toEqual([
        'понедельник',
        'вторник',
        'среда',
      ])
      expect(generateSequence('월요일:수요일', 10)).toEqual([
        '월요일',
        '화요일',
        '수요일',
      ])
    })

    it('lets the other end settle a name several languages share', () => {
      // `mars` is March in French, Swedish and Norwegian. Only one language has both
      // ends of each of these, which is what decides it without any guessing.
      expect(generateSequence('mars:juin', 10)).toEqual([
        'mars',
        'avril',
        'mai',
        'juin',
      ])
      expect(generateSequence('mars:maj', 10)).toEqual(['mars', 'april', 'maj'])
      expect(generateSequence('marzo:giugno', 4)).toEqual([
        'marzo',
        'aprile',
        'maggio',
        'giugno',
      ])
      expect(generateSequence('marzo:junio', 4)).toEqual([
        'marzo',
        'abril',
        'mayo',
        'junio',
      ])
    })

    it('falls back to the most widely used language when nothing settles it', () => {
      // `januari` is Dutch, Swedish, Indonesian and Malay alike, and a lone name has no
      // second end to check against.
      expect(generateSequence('januari', 3)).toEqual([
        'januari',
        'februari',
        'maart',
      ])
    })

    it('keeps case and the long-or-short form', () => {
      expect(generateSequence('JANVIER:MARS', 10)).toEqual([
        'JANVIER',
        'FÉVRIER',
        'MARS',
      ])
      expect(generateSequence('Janvier:Mars', 10)).toEqual([
        'Janvier',
        'Février',
        'Mars',
      ])
      expect(generateSequence('janv.:mars', 10)).toEqual([
        'janv.',
        'févr.',
        'mars',
      ])
      expect(generateSequence('MAYIS::1', 3)).toEqual([
        'MAYIS',
        'HAZİRAN',
        'TEMMUZ',
      ])
    })

    it('accepts the form a language uses inside a date', () => {
      // Russian says января in a date and январь on its own; both are understood, and
      // both are written back in the standalone form.
      expect(generateSequence('января:марта', 10)).toEqual([
        'январь',
        'февраль',
        'март',
      ])
      expect(generateSequence('Ιανουάριος:Μάρτιος', 10)).toEqual([
        'Ιανουαρίου',
        'Φεβρουαρίου',
        'Μαρτίου',
      ])
    })

    it('wraps around the year and the week', () => {
      expect(generateSequence('décembre::1', 3)).toEqual([
        'décembre',
        'janvier',
        'février',
      ])
      expect(generateSequence('samedi::1', 3)).toEqual([
        'samedi',
        'dimanche',
        'lundi',
      ])
    })

    it('leaves English exactly as it was', () => {
      expect(generateSequence('Jan:Jun', 10)).toEqual([
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
      ])
      expect(generateSequence('January:March', 10)).toEqual([
        'January',
        'February',
        'March',
      ])
      expect(generateSequence('Mon:Fri', 10)).toEqual([
        'Mon',
        'Tue',
        'Wed',
        'Thu',
        'Fri',
      ])
      expect(generateSequence('monday:friday', 10)).toEqual([
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
      ])
    })

    it('honours a narrower list of languages', () => {
      expect(generateSequence('janvier:mars', 10, 10, ['de', 'es'])).toEqual([])
      expect(generateSequence('mars:maj', 10, 10, ['sv'])).toEqual([
        'mars',
        'april',
        'maj',
      ])
      expect(generateSequence('mars:maj', 10, 10, ['fr'])).toEqual([])
    })

    it('does not turn a plain number into a month', () => {
      expect(generateSequence('1:3', 10)).toEqual(['1', '2', '3'])
      expect(generateSequence('01:03', 10)).toEqual(['01', '02', '03'])
    })
  })

  describe('East Asian date layouts', () => {
    it('counts days in a suffix-labelled date', () => {
      expect(generateSequence('2023年12月25日:2023年12月29日', 10)).toEqual([
        '2023年12月25日',
        '2023年12月26日',
        '2023年12月27日',
        '2023年12月28日',
        '2023年12月29日',
      ])
      expect(generateSequence('2023년 12월 25일:2023년 12월 29일', 10)).toEqual(
        [
          '2023년 12월 25일',
          '2023년 12월 26일',
          '2023년 12월 27일',
          '2023년 12월 28일',
          '2023년 12월 29일',
        ],
      )
    })

    it('counts months, and a month and day without a year', () => {
      expect(generateSequence('2023年12月:2024年3月', 10)).toEqual([
        '2023年12月',
        '2024年1月',
        '2024年2月',
        '2024年3月',
      ])
      expect(generateSequence('12月25日:12月28日', 10)).toEqual([
        '12月25日',
        '12月26日',
        '12月27日',
        '12月28日',
      ])
    })

    it('keeps the padding and the spacing it was given', () => {
      expect(generateSequence('2023年01月:2023年04月', 10)).toEqual([
        '2023年01月',
        '2023年02月',
        '2023年03月',
        '2023年04月',
      ])
      // Unpadded is the default, because that is how these layouts are normally written.
      expect(generateSequence('2023年12月25日::7', 3)).toEqual([
        '2023年12月25日',
        '2024年1月1日',
        '2024年1月8日',
      ])
      expect(generateSequence('2023년12월:2023년3월', 2)).toEqual([
        '2023년12월',
        '2023년11월',
      ])
    })

    it('crosses a month and a year boundary', () => {
      expect(generateSequence('2023年12月30日:2024年1月2日', 10)).toEqual([
        '2023年12月30日',
        '2023年12月31日',
        '2024年1月1日',
        '2024年1月2日',
      ])
      expect(generateSequence('2024年2月28日:2024年3月1日', 10)).toEqual([
        '2024年2月28日',
        '2024年2月29日',
        '2024年3月1日',
      ])
    })

    it('refuses a date that does not exist, and a mixed script', () => {
      expect(generateSequence('2023年2月30日:2023年3月2日', 10)).toEqual([])
      expect(generateSequence('2023年13月1日', 10)).toEqual([])
      expect(generateSequence('2023年12월25日', 10)).toEqual([])
    })

    it('accepts a year of any length, keeping the width it was written with', () => {
      // Historical dates are written with short years, and `Date.UTC(8, …)` would have
      // read 8年 as 1908 — the two-digit-year rule the language still carries.
      expect(generateSequence('1208年3月9日:1208年3月11日', 10)).toEqual([
        '1208年3月9日',
        '1208年3月10日',
        '1208年3月11日',
      ])
      expect(generateSequence('208年3月9日:208年3月11日', 10)).toEqual([
        '208年3月9日',
        '208年3月10日',
        '208年3月11日',
      ])
      expect(generateSequence('08年3月9日:08年3月11日', 10)).toEqual([
        '08年3月9日',
        '08年3月10日',
        '08年3月11日',
      ])
      expect(generateSequence('8年3月9日:8年3月11日', 10)).toEqual([
        '8年3月9日',
        '8年3月10日',
        '8年3月11日',
      ])
      expect(generateSequence('1208年03月9日:1208年03月11日', 10)).toEqual([
        '1208年03月9日',
        '1208年03月10日',
        '1208年03月11日',
      ])
    })

    it('lets a short year grow rather than truncating it', () => {
      // The width a year was written with is a minimum, never a truncation.
      expect(generateSequence('999年12月30日', 3)).toEqual([
        '999年12月30日',
        '999年12月31日',
        '1000年1月1日',
      ])
      expect(generateSequence('99年12月', 3)).toEqual([
        '99年12月',
        '100年1月',
        '100年2月',
      ])
      // Two ends written to different widths share no format, so the stop cannot bound
      // the sequence and the start's width is what carries.
      expect(generateSequence('999年12月30日:1000年1月1日', 3)).toEqual([
        '999年12月30日',
        '999年12月31日',
        '1000年1月1日',
      ])
    })

    it('leaves the separator-based dates alone', () => {
      expect(generateSequence('2023-12-25:2023-12-27', 10)).toEqual([
        '2023-12-25',
        '2023-12-26',
        '2023-12-27',
      ])
    })
  })

  describe('edge cases', () => {
    it('returns nothing for an unparseable spec', () => {
      expect(generateSequence('', 1)).toEqual([])
    })

    it('treats 1:a as hexadecimal', () => {
      expect(generateSequence('1:a', 10)).toEqual([
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        'a',
      ])
    })

    it('returns nothing when the ends share no numeral system', () => {
      expect(generateSequence('Monday:5', 10)).toEqual([])
    })

    it('generates from a start alone', () => {
      expect(generateSequence('5', 3)).toEqual(['5', '6', '7'])
    })

    it('returns nothing when neither end is a numeral at all', () => {
      expect(generateSequence('invalid:value', 10)).toEqual([])
    })
  })

  describe('step handling', () => {
    it('applies a step within a numeral system', () => {
      expect(generateSequence('0xa:0xf:2', 10)).toEqual(['0xa', '0xc', '0xe'])
    })

    it('applies a negative step within a numeral system', () => {
      expect(generateSequence('0xf:0xa:-2', 10)).toEqual(['0xf', '0xd', '0xb'])
    })

    it('reads a prefixed step instead of collapsing it to zero', () => {
      expect(generateSequence('0x0A::0x10', 4)).toEqual([
        '0x0A',
        '0x1A',
        '0x2A',
        '0x3A',
      ])
      expect(generateSequence('1::0b10', 3)).toEqual(['1', '3', '5'])
      expect(generateSequence('2023-01-01::0x7', 3)).toEqual([
        '2023-01-01',
        '2023-01-08',
        '2023-01-15',
      ])
    })
  })

  describe('selection count handling', () => {
    it('uses the selection count when there is no stop', () => {
      expect(generateSequence('0xa', 3)).toEqual(['0xa', '0xb', '0xc'])
    })

    it('never produces more elements than there are selections', () => {
      expect(generateSequence('1:100', 5)).toEqual(['1', '2', '3', '4', '5'])
    })
  })

  describe('fallback behaviour', () => {
    it('produces plain decimals for a plain decimal range', () => {
      expect(generateSequence('1:3', 10)).toEqual(['1', '2', '3'])
    })
  })

  describe('dates', () => {
    describe('basic date sequences', () => {
      it('generates a Y-M-D sequence', () => {
        expect(generateSequence('2023-01-01:2023-01-05', 10)).toEqual([
          '2023-01-01',
          '2023-01-02',
          '2023-01-03',
          '2023-01-04',
          '2023-01-05',
        ])
      })

      it('generates a D.M.Y sequence', () => {
        expect(generateSequence('01.01.2023:05.01.2023', 10)).toEqual([
          '01.01.2023',
          '02.01.2023',
          '03.01.2023',
          '04.01.2023',
          '05.01.2023',
        ])
      })

      it('steps by two days', () => {
        expect(generateSequence('2023-01-01:2023-01-10:2', 10)).toEqual([
          '2023-01-01',
          '2023-01-03',
          '2023-01-05',
          '2023-01-07',
          '2023-01-09',
        ])
      })

      it('counts down with a negative step', () => {
        expect(generateSequence('2023-01-05:2023-01-01:-1', 10)).toEqual([
          '2023-01-05',
          '2023-01-04',
          '2023-01-03',
          '2023-01-02',
          '2023-01-01',
        ])
      })
    })

    describe('without a stop', () => {
      it('fills the selections from a start date', () => {
        expect(generateSequence('2023-01-01', 4)).toEqual([
          '2023-01-01',
          '2023-01-02',
          '2023-01-03',
          '2023-01-04',
        ])
      })

      it('honours a step with no stop', () => {
        expect(generateSequence('2023-01-01::3', 3)).toEqual([
          '2023-01-01',
          '2023-01-04',
          '2023-01-07',
        ])
      })
    })

    describe('other separators', () => {
      it('handles M/D/Y', () => {
        expect(generateSequence('01/15/2023:01/18/2023', 10)).toEqual([
          '01/15/2023',
          '01/16/2023',
          '01/17/2023',
          '01/18/2023',
        ])
      })

      it('handles D.M.Y', () => {
        expect(generateSequence('15.01.2023:18.01.2023', 10)).toEqual([
          '15.01.2023',
          '16.01.2023',
          '17.01.2023',
          '18.01.2023',
        ])
      })
    })

    describe('year-month sequences', () => {
      it('steps by months', () => {
        expect(generateSequence('2023-01:2023-04', 10)).toEqual([
          '2023-01',
          '2023-02',
          '2023-03',
          '2023-04',
        ])
      })

      it('steps by two months', () => {
        expect(generateSequence('2023-01:2023-07:2', 10)).toEqual([
          '2023-01',
          '2023-03',
          '2023-05',
          '2023-07',
        ])
      })

      it('crosses a year boundary', () => {
        expect(generateSequence('2023-11:2024-02', 10)).toEqual([
          '2023-11',
          '2023-12',
          '2024-01',
          '2024-02',
        ])
      })

      it('fills the selections with no stop', () => {
        expect(generateSequence('2023-01', 3)).toEqual([
          '2023-01',
          '2023-02',
          '2023-03',
        ])
      })
    })

    describe('month-day sequences', () => {
      it('steps by days', () => {
        expect(generateSequence('01-15:01-18', 10)).toEqual([
          '01-15',
          '01-16',
          '01-17',
          '01-18',
        ])
      })

      it('crosses a month boundary', () => {
        expect(generateSequence('01-30:02-02', 10)).toEqual([
          '01-30',
          '01-31',
          '02-01',
          '02-02',
        ])
      })
    })

    describe('error handling', () => {
      it('returns nothing when the start is not a date', () => {
        expect(generateSequence('invalid-date:2023-01-02', 10)).toEqual([])
      })

      it('returns nothing when the start is a date but the stop is not', () => {
        expect(generateSequence('2023-01-01:invalid', 10)).toEqual([])
      })

      it('ignores a stop written in an incompatible date format', () => {
        // No shared format, so the stop cannot bound anything and the selection count
        // decides the length instead.
        expect(generateSequence('2023-01-01:15.02.2023', 10)).toEqual([
          '2023-01-01',
          '2023-01-02',
          '2023-01-03',
          '2023-01-04',
          '2023-01-05',
          '2023-01-06',
          '2023-01-07',
          '2023-01-08',
          '2023-01-09',
          '2023-01-10',
        ])
      })

      it('handles leap days', () => {
        expect(generateSequence('2024-02-28:2024-03-02', 10)).toEqual([
          '2024-02-28',
          '2024-02-29',
          '2024-03-01',
          '2024-03-02',
        ])
      })
    })

    describe('format priority', () => {
      it('picks the highest-priority shared interpretation', () => {
        expect(generateSequence('2023-01-12:2023-01-15', 10)).toEqual([
          '2023-01-12',
          '2023-01-13',
          '2023-01-14',
          '2023-01-15',
        ])
      })

      it('prefers Y-M2-D2 over Y-M1-D1', () => {
        expect(generateSequence('2023-01-01:2023-01-03', 10)).toEqual([
          '2023-01-01',
          '2023-01-02',
          '2023-01-03',
        ])
      })

      it('prefers D2.M2.Y over D1.M1.Y', () => {
        expect(generateSequence('01.01.2023:03.01.2023', 10)).toEqual([
          '01.01.2023',
          '02.01.2023',
          '03.01.2023',
        ])
      })

      it('ignores a stop that uses a different separator', () => {
        expect(generateSequence('2023-01-01:06.01.2023', 10)).toEqual([
          '2023-01-01',
          '2023-01-02',
          '2023-01-03',
          '2023-01-04',
          '2023-01-05',
          '2023-01-06',
          '2023-01-07',
          '2023-01-08',
          '2023-01-09',
          '2023-01-10',
        ])
      })
    })

    describe('days versus months', () => {
      it('counts in days when the format has a day component', () => {
        expect(generateSequence('2023-01-01:2023-01-03', 10)).toEqual([
          '2023-01-01',
          '2023-01-02',
          '2023-01-03',
        ])
      })

      it('counts in months for year-month formats', () => {
        expect(generateSequence('2023-01:2023-03', 10)).toEqual([
          '2023-01',
          '2023-02',
          '2023-03',
        ])
      })

      it('counts in days for month-day formats', () => {
        expect(generateSequence('01-28:02-02', 10)).toEqual([
          '01-28',
          '01-29',
          '01-30',
          '01-31',
          '02-01',
          '02-02',
        ])
      })

      it('crosses a year boundary in days', () => {
        expect(generateSequence('2023-12-30:2024-01-02', 10)).toEqual([
          '2023-12-30',
          '2023-12-31',
          '2024-01-01',
          '2024-01-02',
        ])
      })
    })

    describe('single-date input', () => {
      it('picks a format for an unbounded date', () => {
        expect(generateSequence('2023-01-01', 3)).toEqual([
          '2023-01-01',
          '2023-01-02',
          '2023-01-03',
        ])
      })

      it('picks the highest-priority format for an ambiguous date', () => {
        expect(generateSequence('2023-12-01', 3)).toEqual([
          '2023-12-01',
          '2023-12-02',
          '2023-12-03',
        ])
      })
    })

    describe('cross-boundary sequences', () => {
      it('crosses a month boundary', () => {
        expect(generateSequence('2023-01-30:2023-02-02', 10)).toEqual([
          '2023-01-30',
          '2023-01-31',
          '2023-02-01',
          '2023-02-02',
        ])
      })

      it('crosses a year boundary', () => {
        expect(generateSequence('2023-12-30:2024-01-02', 10)).toEqual([
          '2023-12-30',
          '2023-12-31',
          '2024-01-01',
          '2024-01-02',
        ])
      })
    })

    describe('fractional steps', () => {
      it('refuses a fractional step on a year-month range', () => {
        // Used to interpolate the fraction straight into the output:
        // ['2023-01', '2023-1.5', '2023-02', '2023-2.5', '2023-03'].
        expect(generateSequence('2023-01:2023-03:0.5', 1)).toEqual([])
      })

      it('refuses a fractional step on a day range', () => {
        // Used to truncate instead, so all 19 lines came out in duplicate pairs.
        expect(generateSequence('2023-01-01:2023-01-10:0.5', 1)).toEqual([])
      })

      it('refuses a fractional step on a month-day range', () => {
        expect(generateSequence('01-15:01-18:0.5', 1)).toEqual([])
      })

      it('refuses a fractional step with no stop', () => {
        expect(generateSequence('2023-01-01::1.5', 1)).toEqual([])
      })

      it('refuses a negative fractional step', () => {
        expect(generateSequence('2023-01-05:2023-01-01:-0.5', 1)).toEqual([])
      })

      it('does not fall through to the numeral path', () => {
        // 2023-01 also parses as a decimal followed by junk; reinterpreting it that
        // way would answer a question nobody asked.
        expect(generateSequence('2023-01:2023-03:0.5', 3)).toEqual([])
      })

      it('accepts a whole step written with a decimal point', () => {
        expect(generateSequence('2023-01-01:2023-01-05:2.0', 1)).toEqual([
          '2023-01-01',
          '2023-01-03',
          '2023-01-05',
        ])
      })

      it('still repairs an unreadable step to 1', () => {
        expect(generateSequence('2023-01-01:2023-01-03:abc', 1)).toEqual([
          '2023-01-01',
          '2023-01-02',
          '2023-01-03',
        ])
      })
    })
  })

  describe('zero padding (convnum 1.0 TypeInfo.digits)', () => {
    it('keeps the padding of the start value', () => {
      // convnum 0.2.7 had no `digits` and gave ['1', '2', ... '10'] here.
      expect(generateSequence('01:10', 10)).toEqual([
        '01',
        '02',
        '03',
        '04',
        '05',
        '06',
        '07',
        '08',
        '09',
        '10',
      ])
    })

    it('keeps padding wider than the values need', () => {
      expect(generateSequence('001:005', 10)).toEqual([
        '001',
        '002',
        '003',
        '004',
        '005',
      ])
    })

    it('drops the padding once the value outgrows it', () => {
      expect(generateSequence('08:11', 10)).toEqual(['08', '09', '10', '11'])
    })
  })

  describe('numeral systems', () => {
    it('generates English ordinal abbreviations', () => {
      expect(generateSequence('1st:5th', 10)).toEqual([
        '1st',
        '2nd',
        '3rd',
        '4th',
        '5th',
      ])
    })

    it('generates English ordinal words', () => {
      expect(generateSequence('first:fifth', 10)).toEqual([
        'first',
        'second',
        'third',
        'fourth',
        'fifth',
      ])
    })

    it('generates French ordinal abbreviations', () => {
      expect(generateSequence('1er:5e', 10)).toEqual([
        '1er',
        '2e',
        '3e',
        '4e',
        '5e',
      ])
    })

    it('generates French ordinal words', () => {
      expect(generateSequence('premier:cinquième', 10)).toEqual([
        'premier',
        'deuxième',
        'troisième',
        'quatrième',
        'cinquième',
      ])
    })

    it('generates English words', () => {
      expect(generateSequence('one:five', 10)).toEqual([
        'one',
        'two',
        'three',
        'four',
        'five',
      ])
    })

    it('generates French words', () => {
      expect(generateSequence('un:cinq', 10)).toEqual([
        'un',
        'deux',
        'trois',
        'quatre',
        'cinq',
      ])
    })

    it('generates Chinese words', () => {
      expect(generateSequence('一:五', 10)).toEqual([
        '一',
        '二',
        '三',
        '四',
        '五',
      ])
    })

    it('generates Chinese financial numerals', () => {
      expect(generateSequence('壹:伍', 10)).toEqual([
        '壹',
        '贰',
        '叁',
        '肆',
        '伍',
      ])
    })

    it('generates Chinese solar terms', () => {
      expect(generateSequence('立春:雨水', 10)).toEqual(['立春', '雨水'])
    })

    it('rejects a bare 万, which is canonical in neither system', () => {
      // 万 and 亿 belong to both the ordinary and the financial numerals, and neither
      // system writes them alone: 10000 is 一万 or 壹万. convnum used to accept a bare 万
      // as financial only, because that validator was a character-class test rather than
      // a round trip, so `万` produced a sequence of 大写 numerals nobody asked for.
      expect(generateSequence('万', 4)).toEqual([])
      expect(generateSequence('萬', 4)).toEqual([])
      expect(generateSequence('亿', 4)).toEqual([])
    })

    it('counts from ten thousand written any of the four canonical ways', () => {
      expect(generateSequence('一万', 3)).toEqual([
        '一万',
        '一万零一',
        '一万零二',
      ])
      expect(generateSequence('一萬', 3)).toEqual([
        '一萬',
        '一萬零一',
        '一萬零二',
      ])
      expect(generateSequence('壹万', 3)).toEqual([
        '壹万',
        '壹万零壹',
        '壹万零贰',
      ])
      expect(generateSequence('壹萬', 3)).toEqual([
        '壹萬',
        '壹萬零壹',
        '壹萬零貳',
      ])
    })

    it('takes the script from the stop value when the start is script-neutral', () => {
      // 立春 and 雨水 are written identically in both scripts, so the start value cannot
      // say which one the user meant. 驚蟄 can, and reading the range off the start alone
      // turned a Traditional range into a Simplified sequence.
      expect(generateSequence('立春:驚蟄', 10)).toEqual([
        '立春',
        '雨水',
        '驚蟄',
      ])
      expect(generateSequence('立春:惊蛰', 10)).toEqual([
        '立春',
        '雨水',
        '惊蛰',
      ])
      // A definite start still wins, and two neutral ends fall back to Simplified.
      expect(generateSequence('驚蟄:小滿', 3)).toEqual(['驚蟄', '春分', '清明'])
      expect(generateSequence('立春:雨水', 10)).toEqual(['立春', '雨水'])
    })

    it('generates Cyrillic letters', () => {
      expect(generateSequence('а:я', 5)).toEqual(['а', 'б', 'в', 'г', 'д'])
    })

    it('generates Hebrew letters', () => {
      expect(generateSequence('א:י', 10)).toEqual([
        'א',
        'ב',
        'ג',
        'ד',
        'ה',
        'ו',
        'ז',
        'ח',
        'ט',
        'י',
      ])
    })

    it('generates Greek letters', () => {
      expect(generateSequence('α:ε', 10)).toEqual(['α', 'β', 'γ', 'δ', 'ε'])
    })

    it('generates Greek letter English names', () => {
      expect(generateSequence('Alpha:Delta', 10)).toEqual([
        'Alpha',
        'Beta',
        'Gamma',
        'Delta',
      ])
    })

    it('generates NATO phonetic letters', () => {
      expect(generateSequence('Alfa:Echo', 10)).toEqual([
        'Alfa',
        'Bravo',
        'Charlie',
        'Delta',
        'Echo',
      ])
    })

    it('generates astrological signs', () => {
      expect(generateSequence('Aries:Cancer', 10)).toEqual([
        'Aries',
        'Taurus',
        'Gemini',
        'Cancer',
      ])
    })

    it('generates Eastern Arabic numerals', () => {
      expect(generateSequence('٠:٥', 10)).toEqual([
        '٠',
        '١',
        '٢',
        '٣',
        '٤',
        '٥',
      ])
    })
  })

  describe('defaultLength', () => {
    it('sets the length of an unbounded range at a single cursor', () => {
      expect(generateSequence('1', 1, 3)).toEqual(['1', '2', '3'])
    })

    it('sets the length of an unbounded date range too', () => {
      expect(generateSequence('2023-01-01', 1, 2)).toEqual([
        '2023-01-01',
        '2023-01-02',
      ])
    })

    it('is ignored when a stop bounds the range', () => {
      expect(generateSequence('1:5', 1, 3)).toEqual(['1', '2', '3', '4', '5'])
    })

    it('is ignored once there is more than one selection', () => {
      expect(generateSequence('1', 4, 2)).toEqual(['1', '2', '3', '4'])
    })
  })

  describe('specs with no usable start', () => {
    it('returns nothing for a missing start', () => {
      expect(generateSequence(':5', 10)).toEqual([])
    })

    it('returns nothing for a missing start with a step', () => {
      expect(generateSequence('::2', 10)).toEqual([])
    })

    it('returns nothing for more than two colons', () => {
      expect(generateSequence('1:::5', 10)).toEqual([])
    })

    it('returns nothing for a multi-line spec', () => {
      expect(generateSequence('1\n:5', 10)).toEqual([])
    })
  })

  describe('values the numeral system cannot express', () => {
    it('keeps the roman numerals a range starts with and stops at 4000', () => {
      // 3995..3999 are roman numerals, 4000 is not. The whole sequence used to come
      // back as bare digits because one element failed.
      expect(generateSequence('MMMCMXCV:', 1)).toEqual([
        'MMMCMXCV',
        'MMMCMXCVI',
        'MMMCMXCVII',
        'MMMCMXCVIII',
        'MMMCMXCIX',
      ])
    })

    it('stops at the same place when there are more cursors than numerals', () => {
      expect(generateSequence('MMMCMXCV:', 10)).toEqual([
        'MMMCMXCV',
        'MMMCMXCVI',
        'MMMCMXCVII',
        'MMMCMXCVIII',
        'MMMCMXCIX',
      ])
    })

    it('returns nothing when the very first step leaves the system', () => {
      // 3999 is the last roman numeral, so a sequence from it has nowhere to go.
      expect(generateSequence('MMMCMXCIX', 1)).toEqual([])
    })

    it('still emits a lone value that no step has to follow', () => {
      expect(generateSequence('MMMCMXCIX', 1, 1)).toEqual(['MMMCMXCIX'])
    })

    it('refuses a fractional step on weekdays', () => {
      expect(generateSequence('Mon:Fri:0.5', 1)).toEqual([])
    })

    it('refuses a fractional step on latin letters', () => {
      expect(generateSequence('a:z:0.5', 1)).toEqual([])
    })

    it('refuses a fractional step on month names', () => {
      expect(generateSequence('Jan:Jun:0.5', 1)).toEqual([])
    })

    it('refuses a fractional step on english words', () => {
      expect(generateSequence('one:five:0.5', 1)).toEqual([])
    })

    it('refuses a fractional step on greek letters', () => {
      expect(generateSequence('α:ε:0.5', 1)).toEqual([])
    })

    it('refuses a fractional step on roman numerals', () => {
      expect(generateSequence('II:VI:0.5', 1)).toEqual([])
    })

    it('keeps a fractional step where the system has fractions', () => {
      expect(generateSequence('1:3:0.5', 1)).toEqual([
        '1',
        '1.5',
        '2',
        '2.5',
        '3',
      ])
      expect(generateSequence('一:三:0.5', 1)).toEqual([
        '一',
        '一点五',
        '二',
        '二点五',
        '三',
      ])
      expect(generateSequence('٠:٢:0.5', 1)).toEqual([
        '٠',
        '٠.٥',
        '١',
        '١.٥',
        '٢',
      ])
    })
  })

  describe('runaway ranges', () => {
    it('generates a sequence of exactly the cap', () => {
      expect(generateSequence(`1:${MAX_SEQUENCE_LENGTH}`, 1)).toHaveLength(
        MAX_SEQUENCE_LENGTH,
      )
    })

    it('returns nothing one element past the cap', () => {
      expect(generateSequence(`1:${MAX_SEQUENCE_LENGTH + 1}`, 1)).toEqual([])
    })

    it('returns nothing instead of exhausting the heap', () => {
      // Unbounded, this allocated ~1.26 GB inside the preview debounce; 1:100000000
      // aborted the whole extension host.
      expect(generateSequence('1:10000000', 1)).toEqual([])
      expect(generateSequence('1:100000000', 1)).toEqual([])
    })

    it('returns quickly rather than stalling the keystroke', () => {
      const started = performance.now()
      generateSequence('1:100000000', 1)
      expect(performance.now() - started).toBeLessThan(50)
    })

    it('allows a long range whose step keeps it under the cap', () => {
      expect(generateSequence('1:1000000:100', 1)).toHaveLength(10000)
    })

    it('refuses a date range two centuries long', () => {
      expect(generateSequence('1900-01-01:2100-01-01', 1)).toEqual([])
    })

    it('allows a date range spanning half a century', () => {
      expect(generateSequence('2000-01-01:2049-12-31', 1)).toHaveLength(18263)
    })
  })
})
