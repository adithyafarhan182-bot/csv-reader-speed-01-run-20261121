// csv-fast: a fast, dependency-free reader for broken CSV files.
//
// run(input) answers exactly what csv-reader 1.0.0 answers for the same
// {text, header}: {columns, rows, errors}. It reads the text once, left to
// right, with commas and double quotes, and follows the same broken-row
// policy: a U+FEFF at the very start is dropped; a record ends at LF or
// CRLF and a line left with no characters is no record; outside quotes a CR
// not followed by LF is dropped (stray_cr); a field that opens with a quote
// runs to the next quote that is not doubled, "" inside it is one quote and
// each CRLF or lone CR inside it is read as LF; what follows its closing
// quote, up to the next comma or line break, is appended as it stands
// (quote_junk, when the field ends); a quote that never closes is a literal
// character and the text after it is read again as unquoted
// (unterminated_quote); a quote inside an unquoted field is a literal
// character; fields stay strings, never trimmed or converted.
//
// Speed: the scan never looks at a character twice in the common case. An
// unquoted field is taken with one indexOf(',') plus two bounded indexOf
// checks on the slice it found, so a stray CR or a line break before the
// comma is caught without ever scanning past the field. A quoted field is
// taken with one indexOf('"') per segment, and a segment is copied whole
// unless it holds a line break, in which case its breaks are folded to LF
// with indexOf-driven slicing. Nothing is built a character at a time, and
// no regular expression runs anywhere.

const COMMA = 0;
const BREAK = 1;
const END = 2;

const C_COMMA = 44;
const C_LF = 10;
const C_CR = 13;
const C_QUOTE = 34;

/** csv-reader 1.0.0's answer for one case's input, read faster. */
export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const len = text.length;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  let pos = 0;
  let line = 1;
  if (text.charCodeAt(0) === 0xfeff) pos = 1;

  // The record being read: the line it starts on and the index in rows it
  // takes (null: the header). Every error of the record carries these.
  let recordLine = 1;
  let recordRow = null;

  // What the last field read ended at (COMMA, BREAK or END) and how many
  // characters its scan kept: the scanners write these instead of
  // allocating a result object per field.
  let ended = END;
  let added = 0;

  // Folds every CRLF and lone CR in seg to one LF, and adds the breaks it
  // held onto line. Only called for segments that hold a break.
  function foldBreaks(seg) {
    let breaks = 0;
    let i = seg.indexOf('\n');
    while (i !== -1) {
      breaks += 1;
      i = seg.indexOf('\n', i + 1);
    }
    if (seg.indexOf('\r') === -1) {
      line += breaks;
      return seg;
    }
    let out = '';
    let p = 0;
    for (;;) {
      const ri = seg.indexOf('\r', p);
      if (ri === -1) {
        out += seg.slice(p);
        break;
      }
      out += seg.slice(p, ri);
      out += '\n';
      if (seg.charCodeAt(ri + 1) !== C_LF) breaks += 1;
      p = seg.charCodeAt(ri + 1) === C_LF ? ri + 2 : ri + 1;
    }
    line += breaks;
    return out;
  }

  // Reads an unquoted field starting at pos, appending onto `start`, and
  // returns its value; ended says COMMA, BREAK or END, and added counts
  // the characters this scan kept (the junk test needs it).
  function readUnquoted(start) {
    let value = start;
    added = 0;
    let p = pos;
    for (;;) {
      const ci = text.indexOf(',', p);
      if (ci === -1) {
        // No comma left anywhere: the field ends at the next line break,
        // or at the end of the text.
        const ni = text.indexOf('\n', p);
        if (ni === -1) {
          // No LF left either: the field ends at the next lone CR, or at
          // the end of the text.
          const ri = text.indexOf('\r', p);
          if (ri === -1) {
            if (p < len) {
              value += text.slice(p);
              added += len - p;
            }
            pos = len;
            ended = END;
            return value;
          }
          if (ri > p) {
            value += text.slice(p, ri);
            added += ri - p;
          }
          errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
          p = ri + 1;
          continue;
        }
        // An LF is ahead: the field ends there unless a CR comes first.
        const seg = text.slice(p, ni);
        const ri = seg.indexOf('\r');
        if (ri === -1) {
          value += seg;
          added += seg.length;
          pos = ni + 1;
          line += 1;
          ended = BREAK;
          return value;
        }
        if (ri === seg.length - 1) {
          // CR immediately before the LF: one CRLF break.
          if (ri > 0) {
            value += seg.slice(0, ri);
            added += ri;
          }
          pos = ni + 1;
          line += 1;
          ended = BREAK;
          return value;
        }
        // A lone CR inside the field: drop it and keep reading.
        if (ri > 0) {
          value += seg.slice(0, ri);
          added += ri;
        }
        errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
        p += ri + 1;
        continue;
      }
      // A comma is ahead, but a line break may still end the field first.
      const seg = text.slice(p, ci);
      const ni = seg.indexOf('\n');
      const ri = seg.indexOf('\r');
      if (ni === -1 && ri === -1) {
        value += seg;
        added += seg.length;
        pos = ci + 1;
        ended = COMMA;
        return value;
      }
      const k = ni === -1 ? ri : ri === -1 ? ni : ni < ri ? ni : ri;
      if (seg.charCodeAt(k) === C_LF) {
        if (k > 0) {
          value += seg.slice(0, k);
          added += k;
        }
        pos = p + k + 1;
        line += 1;
        ended = BREAK;
        return value;
      }
      if (seg.charCodeAt(k + 1) === C_LF) {
        // CRLF.
        if (k > 0) {
          value += seg.slice(0, k);
          added += k;
        }
        pos = p + k + 2;
        line += 1;
        ended = BREAK;
        return value;
      }
      // A lone CR: drop it and keep reading after it.
      if (k > 0) {
        value += seg.slice(0, k);
        added += k;
      }
      errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
      p += k + 1;
    }
  }

  // Reads a quoted field whose opening quote is at pos.
  function readQuoted() {
    const open = pos;
    const openLine = line;
    let value = '';
    pos += 1;
    for (;;) {
      const qi = text.indexOf('"', pos);
      if (qi === -1) {
        // The quote never closes: it is a literal character, and the text
        // after it is read again as unquoted.
        pos = open + 1;
        line = openLine;
        errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
        return readUnquoted('"');
      }
      const seg = text.slice(pos, qi);
      if (seg.indexOf('\n') !== -1 || seg.indexOf('\r') !== -1) {
        value += foldBreaks(seg);
      } else {
        value += seg;
      }
      if (text.charCodeAt(qi + 1) === C_QUOTE) {
        // A doubled quote: one quote in the value, and the field goes on.
        value += '"';
        pos = qi + 2;
        continue;
      }
      pos = qi + 1;
      if (pos >= len) {
        ended = END;
        added = 0;
        return value;
      }
      const c = text.charCodeAt(pos);
      if (c === C_COMMA) {
        pos += 1;
        ended = COMMA;
        added = 0;
        return value;
      }
      if (c === C_LF) {
        pos += 1;
        line += 1;
        ended = BREAK;
        added = 0;
        return value;
      }
      if (c === C_CR && text.charCodeAt(pos + 1) === C_LF) {
        pos += 2;
        line += 1;
        ended = BREAK;
        added = 0;
        return value;
      }
      // What follows the closing quote is appended as it stands, up to the
      // next comma or line break.
      const junk = readUnquoted(value);
      if (added > 0) {
        errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
      }
      return junk;
    }
  }

  for (;;) {
    // Lines with no characters are no records.
    while (pos < len) {
      const c = text.charCodeAt(pos);
      if (c === C_LF) {
        pos += 1;
        line += 1;
      } else if (c === C_CR && text.charCodeAt(pos + 1) === C_LF) {
        pos += 2;
        line += 1;
      } else {
        break;
      }
    }
    if (pos >= len) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let quoted = false;
    do {
      quoted = text.charCodeAt(pos) === C_QUOTE;
      fields.push(quoted ? readQuoted() : readUnquoted(''));
    } while (ended === COMMA);

    // A line that held only stray CRs is left with no characters: no record
    // (its stray_cr errors stay).
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
