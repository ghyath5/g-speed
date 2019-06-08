window.Vue.use(VuejsDialog.main.default)
var app = new Vue({
  el: '#app',
  data: {
    socket:null,
    highlighted:0,
    wrong:null,
    sensitive:false,
    openUsersList:true,
    words:[],
    arabicWords:["ان", "جزيرة", "من", "جزائر", "الهند", "التي", "تحت", "خط", "الاستواء", "وهي", "الجزيرة", "التي", "يتولد", "بها", "الانسان", "من", "غير", "ام", "ولا", "اب", "وبها", "شجر", "يثمر", "نساء", "وهي", "التي", "ذكر", "المسعودي", "انها", "جزيرة", "الوقواق", "لان", "تلك", "الجزيرة", "اعدل", "بقاع", "الارض", "هواء", "اتممها", "لشروق", "النور", "الاعلى", "عليها", "كان", "ذلك", "خلاف", "ما", "يراه", "جمهور", "الفلاسفة"],
    englishWords:["much", "four", "school", "grow", "name", "side", "small", "those", "any", "just", "just", "face", "new", "for", "girl", "letter", "good", "part", "long", "right", "line", "stop", "like", "example", "place", "first", "own", "question", "quickly", "need", "miss", "far", "any", "some", "these", "many", "then", "might", "carry", "may", "about"],
    input:'',
    word:'',
    me:{},
    users:[],
    inMatch:false,
    isConnect:false,
    writingSound:null,
    wrongSound:null,
    notifySound:null,
    rejectedSound:null,
    lang:'ar',
    langs:{'ar':'Arabic','en':'english'},
    timer:10,
    layerWait:false,
    players:[],
    roomName:null,
    player:null,
    nameIgnored:false,
    interval:null,
    isPrompet:false
    
  },
  created(){
     this.socket = io();
  },
  mounted(){
      this.writingSound = new Audio('sounds/key.mp3');
      // this.wrongSound = new Audio('sounds/wrong.mp3')
      this.notifySound = new Audio('sounds/notify.mp3')
      this.rejectedSound = new Audio('sounds/rejected.mp3')
      this.prompt();
      var self = this;
      setInterval(()=>{
        if(!self.me.name && self.nameIgnored){
          self.prompt();
          self.nameIgnored = false;
        }
      },4000);
      this.socket.on('send users',(users)=>{
        this.users = users;
      });
      this.socket.on('rejected',(user)=>{
        this.rejectedSound.play();
        self.$dialog.alert(user.name+' reject your request',{okText:'Ok'}).then(function(dialog) {
          console.log('Closed');
        });
      })
      
      this.socket.on('request from',(data)=>{
         if(this.inMatch || this.isPrompet){
            return false;
         }
        this.requestFrom(data);
      });
      this.socket.on('set players',(data)=>{
        if(this.lang == 'ar'){
          this.words = this.arabicWords;
        }else if(this.lang == 'en'){
          this.words = this.englishWords;
        }
        if(this.inMatch){
          return false;
        }
        this.players = (data.players);
        this.timer = 10;
        this.requestAccepted(data);
      })
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
          console.log(((self.highlighted/self.words.length)*100))
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
        self.nameIgnored = true;
        console.log('Prompt dismissed');
      });
    },
    requestFrom(data){
      var self = this;
      this.notifySound.play();
      this.isPrompet = true;
      this.$dialog
        .confirm(data.user.name+' sent you an '+self.langs[data.lang]+' challenge request',{okText:'Accept',cancelText:'Reject'})
        .then(function(dialog) {
          self.isPrompet = false;
          self.lang = data.lang;
          self.roomName = data.roomName;
          self.socket.emit('accepted',{req:data.req,roomName:data.roomName,me:self.me.id,user:data.user});
        })
        .catch(function() {
          self.isPrompet = false;
          self.socket.emit('rejected',{me:self.me,user:data.user});
        });
    },
    requestAccepted(user){
        var self = this;
        this.layerWait = true;
        this.isConnect = true;
        this.interval;
        clearInterval(this.interval);
        this.interval = setInterval(()=>{
          self.timer--;
          if(self.timer == 0){
            self.inMatch = true;
            self.socket.emit('set inMatch',{me:self.me});
            $('#input').focus();
            self.layerWait = false;
            clearInterval(self.interval);
            self.timer = 10;
          }
        },1000);
    },
    sendRequest(id){
      var self = this;
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