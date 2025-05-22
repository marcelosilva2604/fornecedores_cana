from datetime import datetime, timedelta
from flask import Flask, render_template, request

app = Flask(__name__)

@app.route('/', methods=['GET', 'POST'])
def index():
    screenings = None
    if request.method == 'POST':
        dob_str = request.form.get('dob')
        weight = request.form.get('weight')
        try:
            dob = datetime.strptime(dob_str, '%Y-%m-%d')
            weight = float(weight)
        except (ValueError, TypeError):
            screenings = []
        else:
            screenings = [
                ('Triagem 1', dob + timedelta(days=3)),
                ('Triagem 2', dob + timedelta(days=7)),
                ('Triagem 3', dob + timedelta(days=14))
            ]
            if weight < 2500:
                screenings.append(('Triagem 4', dob + timedelta(days=30)))
    return render_template('index.html', screenings=screenings)

if __name__ == '__main__':
    app.run(debug=True)
