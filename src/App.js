import axios from 'axios';
import React, { Component } from 'react';
import './index.css';

class App extends Component {
  handleSubmit(e) {
    e.preventDefault();
    const prompt = e.target.searchQuery.value;
   
    console.log(prompt);
    console.log(process.env.NODE_ENV);
    document.querySelector('#overlay').style.display = 'block';
    const api =
      process.env.NODE_ENV === 'development'
        ? '/test/stabled'
        : 'https://mko6b9drb2.execute-api.us-east-1.amazonaws.com/test/stabled';
    const data = { data: prompt };
    axios({
      method: 'POST',
      data: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
      url: api,
    })
      .then((response) => {
        console.log(response);
        const el = document.querySelector('#myImage');
        el.setAttribute('src', response.data.body);
        setTimeout(() => {
          document.querySelector('#overlay').style.display = 'none';
          const elem = document.getElementById('searchQuery');
          elem.value = '';
          elem.focus();
        }, 500);
      })
      .catch((error) => {
        console.log(error);
      });
  }
  render() {
    return (
      <div className='container'>
        <div id='overlay'>
          <div id='overlayText'>Loading your image please wait...</div>
        </div>
        <form onSubmit={this.handleSubmit}>
          <h1> Welcome to Stable Diffusion AI</h1>
         
          <input
            autoFocus={true}
            type='text'
            name='searchQuery'
            id='searchQuery'
            placeholder='enter desired text'
            required
          />
          <div>
            <input type='submit' value='Submit' />
          </div>
          <div>
            <br></br>
            <img
              id='myImage'
              alt='Your Image will appear here'
              className='imageContainer'
            />
          </div>
        </form>
      </div>
    );
  }
}

export default App;
