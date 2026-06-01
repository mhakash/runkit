use serde::{Deserialize, Serialize};
use sqlparser::ast::{BinaryOperator, Expr, UnaryOperator, Value};
use sqlparser::dialect::GenericDialect;
use sqlparser::parser::Parser;

#[derive(Serialize)]
pub struct CsvData {
    pub headers: Vec<String>,
    pub rows: Vec<Vec<String>>,
    pub row_count: usize,
}

#[derive(Deserialize)]
pub struct WriteCsvPayload {
    pub path: String,
    pub headers: Vec<String>,
    pub rows: Vec<Vec<String>>,
}

#[tauri::command]
pub fn read_csv(path: String) -> Result<CsvData, String> {
    let mut rdr = csv::ReaderBuilder::new()
        .flexible(true)
        .from_path(&path)
        .map_err(|e| e.to_string())?;

    let headers: Vec<String> = rdr
        .headers()
        .map_err(|e| e.to_string())?
        .iter()
        .map(|s| s.to_string())
        .collect();

    let col_count = headers.len();

    let mut rows: Vec<Vec<String>> = Vec::new();
    for result in rdr.records() {
        let record = result.map_err(|e| e.to_string())?;
        let mut row: Vec<String> = record.iter().map(|s| s.to_string()).collect();
        // Pad short rows so every row has the same column count
        while row.len() < col_count {
            row.push(String::new());
        }
        rows.push(row);
    }

    let row_count = rows.len();
    Ok(CsvData { headers, rows, row_count })
}

#[derive(Deserialize)]
pub struct FilterCsvPayload {
    pub headers: Vec<String>,
    pub rows: Vec<Vec<String>>,
    pub where_clause: String,
}

#[tauri::command]
pub fn filter_csv(payload: FilterCsvPayload) -> Result<Vec<usize>, String> {
    let sql = format!("SELECT * FROM t WHERE {}", payload.where_clause);
    let dialect = GenericDialect {};
    let ast = Parser::parse_sql(&dialect, &sql).map_err(|e| e.to_string())?;

    let where_expr = match ast.into_iter().next() {
        Some(sqlparser::ast::Statement::Query(q)) => {
            match *q.body {
                sqlparser::ast::SetExpr::Select(s) => {
                    s.selection.ok_or_else(|| "No WHERE clause".to_string())?
                }
                _ => return Err("Unexpected query form".to_string()),
            }
        }
        _ => return Err("Failed to parse WHERE clause".to_string()),
    };

    let mut matching = Vec::new();
    for (i, row) in payload.rows.iter().enumerate() {
        if eval_expr(&where_expr, &payload.headers, row)? {
            matching.push(i);
        }
    }
    Ok(matching)
}

fn coerce_compare(a: &str, b: &str) -> std::cmp::Ordering {
    match (a.parse::<f64>(), b.parse::<f64>()) {
        (Ok(an), Ok(bn)) => an.partial_cmp(&bn).unwrap_or(std::cmp::Ordering::Equal),
        _ => a.to_lowercase().cmp(&b.to_lowercase()),
    }
}

fn eval_expr(expr: &Expr, headers: &[String], row: &[String]) -> Result<bool, String> {
    match expr {
        Expr::BinaryOp { left, op, right } => {
            match op {
                BinaryOperator::And => {
                    Ok(eval_expr(left, headers, row)? && eval_expr(right, headers, row)?)
                }
                BinaryOperator::Or => {
                    Ok(eval_expr(left, headers, row)? || eval_expr(right, headers, row)?)
                }
                _ => {
                    let lv = resolve_value(left, headers, row)?;
                    let rv = resolve_value(right, headers, row)?;
                    let ord = coerce_compare(&lv, &rv);
                    match op {
                        BinaryOperator::Eq => Ok(ord == std::cmp::Ordering::Equal),
                        BinaryOperator::NotEq => Ok(ord != std::cmp::Ordering::Equal),
                        BinaryOperator::Gt => Ok(ord == std::cmp::Ordering::Greater),
                        BinaryOperator::GtEq => Ok(ord != std::cmp::Ordering::Less),
                        BinaryOperator::Lt => Ok(ord == std::cmp::Ordering::Less),
                        BinaryOperator::LtEq => Ok(ord != std::cmp::Ordering::Greater),
                        _ => Err(format!("Unsupported operator: {:?}", op)),
                    }
                }
            }
        }
        Expr::UnaryOp { op, expr } => match op {
            UnaryOperator::Not => Ok(!eval_expr(expr, headers, row)?),
            _ => Err(format!("Unsupported unary operator: {:?}", op)),
        },
        Expr::Like { expr, negated, pattern, .. } => {
            let v = resolve_value(expr, headers, row)?;
            let p = resolve_value(pattern, headers, row)?;
            let re_pat = regex::escape(&p).replace("\\%", ".*").replace("\\_", ".");
            let re = regex::Regex::new(&format!("(?i)^{}$", re_pat))
                .map_err(|e| e.to_string())?;
            let matched = re.is_match(&v);
            Ok(if *negated { !matched } else { matched })
        }
        Expr::ILike { expr, negated, pattern, .. } => {
            let v = resolve_value(expr, headers, row)?;
            let p = resolve_value(pattern, headers, row)?;
            let re_pat = regex::escape(&p).replace("\\%", ".*").replace("\\_", ".");
            let re = regex::Regex::new(&format!("(?i)^{}$", re_pat))
                .map_err(|e| e.to_string())?;
            let matched = re.is_match(&v);
            Ok(if *negated { !matched } else { matched })
        }
        Expr::IsNull(inner) => {
            let v = resolve_value(inner, headers, row)?;
            Ok(v.is_empty())
        }
        Expr::IsNotNull(inner) => {
            let v = resolve_value(inner, headers, row)?;
            Ok(!v.is_empty())
        }
        Expr::Between { expr, negated, low, high } => {
            let v = resolve_value(expr, headers, row)?;
            let lo = resolve_value(low, headers, row)?;
            let hi = resolve_value(high, headers, row)?;
            let in_range = coerce_compare(&v, &lo) != std::cmp::Ordering::Less
                && coerce_compare(&v, &hi) != std::cmp::Ordering::Greater;
            Ok(if *negated { !in_range } else { in_range })
        }
        Expr::InList { expr, list, negated } => {
            let v = resolve_value(expr, headers, row)?;
            let found = list.iter().any(|item| {
                resolve_value(item, headers, row)
                    .map(|rv| coerce_compare(&v, &rv) == std::cmp::Ordering::Equal)
                    .unwrap_or(false)
            });
            Ok(if *negated { !found } else { found })
        }
        Expr::Nested(inner) => eval_expr(inner, headers, row),
        _ => Err(format!("Unsupported expression type")),
    }
}

fn resolve_value(expr: &Expr, headers: &[String], row: &[String]) -> Result<String, String> {
    match expr {
        Expr::Identifier(ident) => {
            let name = ident.value.to_lowercase();
            headers
                .iter()
                .position(|h| h.to_lowercase() == name)
                .and_then(|i| row.get(i))
                .map(|s| s.clone())
                .ok_or_else(|| format!("Unknown column: {}", ident.value))
        }
        Expr::Value(v) => match v {
            Value::SingleQuotedString(s) | Value::DoubleQuotedString(s) => Ok(s.clone()),
            Value::Number(n, _) => Ok(n.clone()),
            Value::Boolean(b) => Ok(b.to_string()),
            Value::Null => Ok(String::new()),
            _ => Err(format!("Unsupported value type")),
        },
        Expr::Nested(inner) => resolve_value(inner, headers, row),
        _ => Err(format!("Cannot resolve expression to value")),
    }
}

#[tauri::command]
pub fn write_csv(payload: WriteCsvPayload) -> Result<(), String> {
    let mut wtr = csv::WriterBuilder::new()
        .from_path(&payload.path)
        .map_err(|e| e.to_string())?;

    wtr.write_record(&payload.headers).map_err(|e| e.to_string())?;
    for row in &payload.rows {
        wtr.write_record(row).map_err(|e| e.to_string())?;
    }
    wtr.flush().map_err(|e| e.to_string())?;
    Ok(())
}
