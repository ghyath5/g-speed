window.Vue.use(VuejsDialog.main.default)
var app = new Vue({
  el: '#app',
  data: {
    socket:null,
    highlighted:0,
    wrong:null,
    sensitive:false,
    openUsersList:false,
    words:['fai','aiea','ad'],
    input:'',
    word:'',
    me:{},
    users:[],
    isConnect:false
    
  },
  created(){
     this.socket = io();
  },
  mounted(){
      this.prompt();
      var self = this;
      this.socket.on('send users',(users)=>{
        this.users = users;
      });
      this.socket.on('request from',(data)=>{
         if(this.isConnect){
            return false;
         }
        this.requestFrom(data);
      });
      this.socket.on('request accepted',(data)=>{
        if(this.isConnect){
          return false;
        }
        this.requestAccepted(data);
      })
      $('#input').on('textInput', e => {
           var keyCode = e.originalEvent.data.charCodeAt(0);
           if(keyCode == 32){
             self.check();
             return false;
           }
      })
  },
  methods:{
    check(){
      var self = this;
      var wordslength = this.words.length;
      if(this.highlighted >= this.words.length){
           return false;
      }
       this.isSens();
       if(this.word == this.input){
          $('.word'+this.highlighted).css({'background':'green','color':'white'});
       }else{
          $('.word'+this.highlighted).css({'background':'red','color':'white'});
       }
        self.input = '';
        self.highlighted+=1;
      
    },
    tracking(e){
      if(this.highlighted >= this.words.length){
           return false;
      }
      if(e.keyCode != 32){
        var word = this.words[this.highlighted];
        var length = this.input.length;
        this.isSens();
        if(this.word.substring(0,length) == this.input){
          this.wrong = null;
        }else{
          this.wrong = this.highlighted;
        }
      }
    },
    isSens(){
       if(!this.sensitive){
          this.word = this.words[this.highlighted].trim().toLowerCase();
          this.input = this.input.trim().toLowerCase();
        }else{
          this.word = this.words[this.highlighted].trim();
          this.input = this.input.trim();
        }
    },
    prompt(){
      var self = this;
      this.$dialog
      .prompt({
        title: "What is your name?",
        body: "We will use your name as your identity in our website",
        promptHelp: 'Type in the box below and click "[+:okText]"'
      },{okText:'Confirm'})
      .then(dialog => {
        if(dialog.data.trim() != ''){
          self.socket.emit('new user',{name:dialog.data},function(res){
            self.me = res.me;
            self.users = res.users;
          })
        }
      })
      .catch(() => {
        console.log('Prompt dismissed');
      });
    },
    requestFrom(user){
      var self = this;
      this.$dialog
        .confirm(user.name+' has request you challenge request',{okText:'Accept'})
        .then(function(dialog) {
          self.isConnect = true;
          self.socket.emit('accepted',{me:self.me.id,user:user});
        })
        .catch(function() {
          console.log('Clicked on cancel');
        });
    },
    requestAccepted(user){
        this.isConnect = true;
    },
    sendRequest(id){
      this.socket.emit(`request to`,{id:id,me:this.me.id});
    }
  }
})