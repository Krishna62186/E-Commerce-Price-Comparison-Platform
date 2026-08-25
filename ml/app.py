from flask import Flask, request, jsonify
app = Flask(__name__)

@app.post('/predict')
def predict():
    payload = request.get_json(force=True)
    prices = [float(x) for x in payload.get('prices', [])]
    current = float(payload.get('current_price', prices[-1] if prices else 0))
    if len(prices) < 2:
        predicted = current
    else:
        # Least-squares straight-line forecast over a short historical window.
        recent = prices[-12:]
        n = len(recent); xmean = (n - 1) / 2; ymean = sum(recent) / n
        denominator = sum((i - xmean) ** 2 for i in range(n)) or 1
        slope = sum((i - xmean) * (v - ymean) for i, v in enumerate(recent)) / denominator
        predicted = max(0, ymean + slope * (n + 6 - xmean))
    recommendation = 'BUY' if current <= predicted * .985 else 'WAIT'
    return jsonify(predicted_price=round(predicted), recommendation=recommendation, confidence='Trend forecast based on tracked demo prices')

@app.get('/health')
def health(): return {'ok': True}

if __name__ == '__main__': app.run(port=8000, debug=True)
