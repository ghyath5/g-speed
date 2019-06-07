window.Vue.use(VuejsDialog.main.default)
var app = new Vue({
  el: '#app',
  data: {
    socket:null,
    highlighted:0,
    wrong:null,
    sensitive:false,
    openUsersList:true,
    words:["أن", "جزيرة", "من", "جزائر", "الهند", "التي", "تحت", "خط", "الاستواء", "وهي", "الجزيرة", "التي", "يتولد", "بها", "الإنسان", "من", "غير", "أم", "ولا", "أب", "وبها", "شجر", "يثمر", "نساء", "وهي", "التي", "ذكر", "المسعودي", "أنها", "جزيرة", "الوقواق", "لان", "تلك", "الجزيرة", "اعدل", "بقاع", "الأرض", "هواء", "أتممها", "لشروق", "النور", "الأعلى", "عليها", "استعدادً،", "وان", "كان", "ذلك", "خلاف", "ما", "يراه", "جمهور", "الفلاسفة"],
    input:'',
    word:'',
    me:{},
    users:[],
    isConnect:false,
    writingSound:null,
    wrongSound:null,
    lang:'ar',
    langs:{'ar':'Arabic','en':'english'},
    timer:5,
    layerWait:false,
    players:[],
    roomName:null,
    player:null
    
  },
  created(){
     this.socket = io();
  },
  mounted(){
      this.writingSound = new Audio('sounds/key.mp3');
      // this.wrongSound = new Audio('sounds/wrong.mp3')
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
        this.player = data;
        this.players.push(data);
        this.requestAccepted(data);
      });
      this.socket.on('resulting',(data)=>{
        var percentage =((data.result/self.words.length)*100);
        $(".player-"+data.user.id).css('left',percentage+'%');
      });
      
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
          $('.word'+this.highlighted).css({'color':'green'});
          self.input = '';
          self.socket.emit('walking',{roomName:self.roomName,me:self.me,result:self.highlighted+1});
          self.highlighted++;
          if(((self.highlighted/self.words.length)*100) == 100){
            self.$dialog.alert('Congratulations, You have finished!').then(function(dialog) {
              console.log('Closed');
            });
          }
       }else{
          $('.word'+this.highlighted).css({'color':'red'});
       }
    },
    tracking(e){
      if(this.highlighted >= this.words.length){
           return false;
      }
      if(e.keyCode != 32){
        this.writingSound.currentTime = 0;
        // this.wrongSound.currentTime = 0;
        var word = this.words[this.highlighted];
        var length = this.input.length;
        this.isSens();
        if((this.word.substring(0,length) == this.input)){
          $('.word'+this.highlighted).html("<span class='correct'>"+this.word.substring(0,length)+"</span>"+this.word.substring(length,this.word.length))
          this.wrong = null;
          this.writingSound.play();
        }else{
          this.wrong = this.highlighted;
          // this.wrongSound.play();
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
    requestFrom(data){
      var self = this;
      this.$dialog
        .confirm(data.user.name+' sent you an '+self.langs[data.lang]+' challenge request',{okText:'Accept'})
        .then(function(dialog) {
          self.lang = data.lang;
          self.socket.emit('accepted',{roomName:data.roomName,me:self.me.id,user:data.user});
          self.player = data.user;
          self.players.push(data.user);
          self.players.push(self.me);
          self.roomName = data.roomName;
          self.requestAccepted();
        })
        .catch(function() {
          self.socket.emit('rejected',{me:self.me.id,user:data.user});
        });
    },
    requestAccepted(user){
        var self = this;
        this.isConnect = true;
        this.layerWait = true;
        var timer = setInterval(()=>{
          self.timer--;
          if(self.timer == 0){
            $('#input').focus();
            this.layerWait = false;
            clearInterval(timer);
            self.timer = 5;
          }
        },1000);
    },
    sendRequest(id){
      var self = this;
      this.players.push(this.me);
      this.$dialog
        .confirm('Which language do you want to type?',{okText:'عربي',cancelText:'English'})
        .then(function(dialog) {
          self.lang = 'ar';
          self.socket.emit(`request to`,{id:id,me:self.me.id,lang:'ar'},function(res){
            self.roomName = res.roomName;
          });
        }).catch(function() {
          self.lang = 'en';
          self.socket.emit('request to',{id:id,me:self.me.id,lang:'en'},function(res){
            self.roomName = res.roomName;
          });
        });
    }
  }
})